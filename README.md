# TRIPL PARTS — katalog używanych części

Katalog części z panelem administratora, mini-kontami dla klientów i emailem potwierdzającym zamówienie.
Frontend: HTML/CSS/JS. Backend: Supabase (baza + auth + storage + Edge Functions). Hosting: Cloudflare Pages.

## Co działa
- Publiczny katalog z filtrami (marka, kategoria, wyszukiwanie, sortowanie).
- Koszyk, checkout, wysyłka zamówienia.
- **Mini-rejestracja klienta** przy składaniu zamówienia (opcjonalna).
- **Email z potwierdzeniem zamówienia** (Resend).
- **Strona „Moje zamówienia”** dla zarejestrowanych klientów.
- Panel administratora (logowanie, CRUD produktów, rozbieralni, zamówień, загрузка zdjęć).
- Мультиязычность (PL/EN/PT) + валюты (PLN/EUR).

## Порядок установки

### 1. Supabase
1. Создайте проект → **SQL Editor** → выполните `supabase-setup.sql`.
2. **⚠️ Замените email админа** в первой части SQL:
   ```sql
   insert into public.admins (email) values ('ВАШ_EMAIL');