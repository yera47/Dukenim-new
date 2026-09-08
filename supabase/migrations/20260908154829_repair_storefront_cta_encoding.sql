-- Repair only the exact legacy encoding error, never merchant-written text.
alter table public.tenant_storefront_settings alter column hero_cta_label set default 'Смотреть каталог';
update public.tenant_storefront_settings
set hero_cta_label='Смотреть каталог'
where hero_cta_label='РЎРјРѕС‚СЂРµС‚СЊ РєР°С‚Р°Р»РѕРі';
