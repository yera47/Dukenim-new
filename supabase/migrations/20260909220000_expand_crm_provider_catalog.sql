-- Keep the existing request workflow while allowing the complete CRM/ERP/POS
-- partnership wave to be selected explicitly. Credentials remain out of this table.
alter table public.crm_integration_requests
  drop constraint if exists crm_integration_requests_provider_check;

alter table public.crm_integration_requests
  add constraint crm_integration_requests_provider_check check (provider in (
    'not_selected',
    'rosta', 'umag', 'paloma365', 'billz',
    'moysklad', 'retailcrm', 'biznes_ru', 'subtotal', 'insales',
    'kommo', 'bitrix24', 'planfix', 'megaplan', 's2', 'okocrm', 'envycrm', 'keycrm', 'salesdrive',
    'iiko', 'r_keeper', 'poster', 'quick_resto', 'jowi',
    'one_c', 'other'
  ));
