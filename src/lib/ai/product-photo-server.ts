import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAzureFlux2Transport, createAzureProductImageProvider, getAzureProductImageConfig } from "./azure-product-image-provider";
import { loadCreditPlatformControl, loadTenantCreditBalance } from "./product-credit-admin";
import { ProductImageProviderError, type ProductImageResult } from "./product-image-provider";
import { generateProductPhotoPack, type ProductPhotoLedger, type ProductPhotoPackRequest, type ProductPhotoPackResult } from "./product-photo-generation";

const runtimeConfigSchema = z.object({
  liveEnabled: z.literal("true"),
  maxPackCostMicros: z.coerce.number().int().positive(),
  resolution: z.string().trim().min(1).max(32),
});

type DbError = { message?: string; code?: string } | null;
type RpcResult = { data: unknown; error: DbError };
type QueryResult = { data: unknown; error: DbError };
type AdminLike = {
  rpc(name: string, args: Record<string, unknown>): Promise<RpcResult>;
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): { maybeSingle(): Promise<QueryResult> };
        maybeSingle(): Promise<QueryResult>;
      };
    };
  };
  storage: { from(bucket: string): {
    upload(path: string, body: Uint8Array, options: { contentType: string; upsert: boolean }): Promise<{ error: DbError }>;
    createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: DbError }>;
  } };
};

function requireData<T>(result: { data: unknown; error: DbError }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message ?? result.error.code ?? "database error"}`);
  return result.data as T;
}

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export function getProductPhotoRuntimeStatus(env: NodeJS.ProcessEnv = process.env) {
  const azure = getAzureProductImageConfig(env);
  const runtime = runtimeConfigSchema.safeParse({
    liveEnabled: env.AI_PRODUCT_PHOTO_LIVE_ENABLED,
    maxPackCostMicros: env.AI_PRODUCT_PHOTO_MAX_PACK_USD_MICROS,
    resolution: env.AI_PRODUCT_PHOTO_RESOLUTION,
  });
  return {
    configured: azure.configured && runtime.success,
    azureReady: azure.configured,
    runtime: runtime.success ? runtime.data : null,
  };
}

export function createProductPhotoLedger(client: AdminLike): ProductPhotoLedger {
  return {
    async findCachedPack({ tenantId, idempotencyKey }) {
      const reservationResult = await client.from("ai_product_credit_reservations")
        .select("id,status,output_count")
        .eq("tenant_id", tenantId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (reservationResult.error || !reservationResult.data) return null;
      const reservation = reservationResult.data as { id: string; status: string; output_count: number };
      if (!["settled", "partially_settled"].includes(reservation.status)) return null;
      const outputsResult = await client.from("ai_product_credit_outputs")
        .select("output_index,provider_output_id,storage_path,model,model_version,estimated_usd_micros,billing_basis")
        .eq("tenant_id", tenantId)
        .eq("reservation_id", reservation.id);
      const rows = requireData<Array<{ output_index: number; provider_output_id: string; storage_path: string; model: string; model_version: string | null; estimated_usd_micros: number; billing_basis: "provider-reported" | "configured-ceiling" }>>(outputsResult as unknown as QueryResult, "read cached outputs") ?? [];
      const bucket = client.storage.from("ai-product-photos");
      const outputs: ProductImageResult[] = await Promise.all(rows.map(async row => ({
        imageUrl: requireData<{ signedUrl: string }>(await bucket.createSignedUrl(row.storage_path, 900), "sign cached output").signedUrl,
        storagePath: row.storage_path,
        requestId: row.provider_output_id,
        model: row.model,
        version: row.model_version,
        usage: { outputImages: 1, billedAmountMicros: row.estimated_usd_micros, billingBasis: row.billing_basis },
        provenance: { kind: "ai-assisted-product-photo", sourcePreserved: true, provider: "azure-ai-foundry", disposition: "review-copy" },
      })));
      return { reservationId: reservation.id, outputs, failedOutputs: Math.max(0, reservation.output_count - outputs.length), cached: true };
    },
    async reservePack(input) {
      const data = requireData<unknown>(await client.rpc("reserve_ai_product_credits", {
        p_tenant_id: input.tenantId,
        p_requested_by: input.actorId,
        p_idempotency_key: input.idempotencyKey,
        p_output_count: input.outputCount,
        p_model: input.model,
        p_resolution: input.resolution,
        p_reference_mp: input.referenceMegapixels,
        p_expected_usd_micros_per_output: input.expectedUsdMicrosPerOutput,
      }), "reserve AI product credits");
      const row = firstRow(data) as { reservation_id: string; acquired: boolean } | null;
      if (!row?.reservation_id) throw new Error("reserve AI product credits returned no reservation");
      return { reservationId: row.reservation_id, acquired: Boolean(row.acquired) };
    },
    async recordOutput(input) {
      requireData(await client.rpc("record_ai_product_output", {
        p_tenant_id: input.tenantId,
        p_reservation_id: input.reservationId,
        p_output_index: input.outputIndex,
        p_provider_output_id: input.result.requestId,
        p_storage_path: input.result.storagePath,
        p_model: input.result.model,
        p_model_version: input.result.version,
        p_estimated_usd_micros: input.result.usage.billedAmountMicros,
        p_billing_basis: input.result.usage.billingBasis,
      }), "record AI product output");
    },
    async settlePack(input) {
      requireData(await client.rpc("settle_ai_product_credits", {
        p_tenant_id: input.tenantId,
        p_reservation_id: input.reservationId,
        p_successful_outputs: input.successfulOutputs,
        p_provider_request_ids: input.providerRequestIds,
      }), "settle AI product credits");
    },
    async releasePack(input) {
      requireData(await client.rpc("release_ai_product_credit_reservation", { p_tenant_id: input.tenantId, p_reservation_id: input.reservationId, p_reason: input.reason }), "release AI product credits");
    },
    async markUncertain(input) {
      requireData(await client.rpc("mark_ai_product_credit_reservation_uncertain", { p_tenant_id: input.tenantId, p_reservation_id: input.reservationId, p_reason: input.reason,
        p_recovery_metadata: input.result ? { output_index: input.outputIndex, provider_output_id: input.result.requestId, storage_path: input.result.storagePath, model: input.result.model, model_version: input.result.version, estimated_usd_micros: input.result.usage.billedAmountMicros, billing_basis: input.result.usage.billingBasis } : {} }), "mark AI product credits uncertain");
    },
  };
}

export async function getProductPhotoServerStatus(tenantId: string) {
  const runtime = getProductPhotoRuntimeStatus();
  if (!runtime.configured) return { enabled: false, azureReady: runtime.azureReady, creditLedgerReady: false, reason: "server-configuration-incomplete" as const };
  const admin = createAdminClient();
  const [account, platform] = await Promise.all([loadTenantCreditBalance(admin, tenantId), loadCreditPlatformControl(admin)]);
  const creditLedgerReady = account.availability === "ready" && platform.availability === "ready";
  return {
    enabled: creditLedgerReady && account.generationEnabled && !platform.killSwitch,
    azureReady: true,
    creditLedgerReady,
    reason: !creditLedgerReady ? "credit-ledger-unavailable" as const : platform.killSwitch ? "platform-kill-switch" as const : !account.generationEnabled ? "tenant-disabled" as const : "ready" as const,
  };
}

export async function runProductPhotoGeneration(request: ProductPhotoPackRequest): Promise<ProductPhotoPackResult> {
  const status = getProductPhotoRuntimeStatus();
  if (!status.configured || !status.runtime) throw new Error("Product photo server configuration is incomplete.");
  const admin = createAdminClient() as unknown as AdminLike;
  const bucket = admin.storage.from("ai-product-photos");
  const transport = createAzureFlux2Transport({
    persistOutput: async ({ tenantId, idempotencyKey, bytes, contentType }) => {
      const storagePath = `${tenantId}/ai/product-photos/${idempotencyKey}.jpg`;
      const upload = await bucket.upload(storagePath, bytes, { contentType, upsert: false });
      if (upload.error) throw new ProductImageProviderError("Generated image could not be stored durably.", "unknown");
      const signed = await bucket.createSignedUrl(storagePath, 900);
      if (signed.error || !signed.data?.signedUrl) throw new ProductImageProviderError("Generated image was stored but could not be signed.", "unknown");
      return { storagePath, imageUrl: signed.data.signedUrl };
    },
  });
  const provider = createAzureProductImageProvider({ transport });
  return generateProductPhotoPack({ request, provider, ledger: createProductPhotoLedger(admin), maxPackCostMicros: status.runtime.maxPackCostMicros });
}
