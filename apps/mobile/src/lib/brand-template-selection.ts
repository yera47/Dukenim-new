export function initialBrandTemplate(saved: string | null | undefined, choices: readonly { key: string }[]) {
  return saved || choices[0]?.key || "market";
}

export function isLegacyBrandTemplate(saved: string | null | undefined, choices: readonly { key: string }[]) {
  return Boolean(saved && !choices.some(choice => choice.key === saved));
}
