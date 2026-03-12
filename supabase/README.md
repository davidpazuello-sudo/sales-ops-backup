# Supabase do projeto

Este diretorio agora segue a seguinte regra:

- `supabase/migrations/` e a fonte oficial do schema versionado
- `supabase/*.sql` sao referencias historicas e snapshots de trabalho

## Arquivos oficiais

- `migrations/20260311110000_access_control_baseline.sql`
- `migrations/20260311111000_operational_tables_audit_and_events.sql`

## Fluxo recomendado

Criar migration nova:

```bash
npx supabase@latest migration new nome_da_mudanca
```

Aplicar localmente:

```bash
npx supabase@latest db reset
```

Aplicar em ambiente remoto revisado:

```bash
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest db push
```

Consulte tambem:

- `docs/SUPABASE-MIGRATIONS-E-RLS.md`
- `docs/SEGURANCA-E-ROTACAO-DE-SEGREDOS.md`
