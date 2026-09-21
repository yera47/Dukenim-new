-- New workspaces stay private until the owner explicitly publishes the catalogue.
alter table public.tenants alter column catalog_published set default false;
