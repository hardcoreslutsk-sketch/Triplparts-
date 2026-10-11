# ARVORN Auto Parts — katalog używanych części

Responsywny katalog w języku polskim. Frontend: HTML/CSS/JS; baza, logowanie i zdjęcia: Supabase. Hosting statyczny: Cloudflare Pages.

## Co działa w projekcie
- Publiczny katalog z wyszukiwaniem po nazwie, kategorii, marce, modelu, roczniku, OEM i opisie.
- Filtry kategorii i marki; produkty sprzedane są ukryte w publicznym katalogu.
- Ceny w PLN, status dostępności, zdjęcia, zapytanie przez WhatsApp.
- Panel administratora: logowanie e-mail/hasło, dodawanie, edycja, usuwanie produktów, przesyłanie zdjęć.
- Widok responsywny dla telefonu i komputera.

## Ważne przed publikacją
Projekt nie jest jeszcze podłączony do Twojej bazy ani danych kontaktowych. W trybie bez konfiguracji strona pokazuje 4 przykładowe pozycje — nie są to prawdziwe oferty. Uzupełnij `config.js` dopiero po utworzeniu projektu Supabase.

## Krok 1 — utwórz bazę Supabase
1. Otwórz https://supabase.com/ i załóż konto.
2. Utwórz nowy projekt (region w Europie, np. Frankfurt, jeśli jest dostępny). Zapisz hasło bazy w bezpiecznym miejscu.
3. W projekcie otwórz **SQL Editor → New query**.
4. Skopiuj cały plik `supabase-setup.sql`, wklej go do edytora i kliknij **Run**.
5. Otwórz **Authentication → Users → Add user** i utwórz użytkownika administratora z własnym adresem e-mail i mocnym hasłem. Wyłącz publiczną rejestrację, jeśli jest włączona. Nie twórz kont dla kupujących.
6. Otwórz **Project Settings → API** (lub Connect, zależnie od interfejsu) i skopiuj Project URL oraz klucz `anon`/`publishable`. Nigdy nie używaj klucza `service_role` w plikach strony.

## Krok 2 — skonfiguruj stronę
Otwórz `config.js` i uzupełnij:
- `SUPABASE_URL` — Project URL z Supabase.
- `SUPABASE_ANON_KEY` — klucz publiczny anon/publishable.
- `WHATSAPP_NUMBER` — numer firmy w formacie międzynarodowym, tylko cyfry, np. `48XXXXXXXXX`.
- `PHONE_NUMBER` — numer telefonu, np. `+48 ...`.

Nie publikuj żadnego hasła ani `service_role` key. Publiczny anon/publishable key może znajdować się w kodzie strony, ponieważ dostęp ograniczają reguły RLS z pliku SQL.

## Krok 3 — sprawdź lokalnie
Otwórz `index.html` w przeglądarce. Jeśli przeglądarka ogranicza działanie plików lokalnych, uruchom prosty lokalny serwer albo przejdź od razu do wdrożenia na Cloudflare Pages. Zaloguj się przez `admin.html`, dodaj testową część i sprawdź, czy pojawia się w katalogu.

## Krok 4 — bezpłatna publikacja na Cloudflare Pages
1. Załóż konto na https://dash.cloudflare.com/.
2. Utwórz projekt Pages, wybierając **Direct Upload** (jeśli ta opcja jest dostępna) i prześlij pliki strony: `index.html`, `admin.html`, `styles.css`, `config.js`, `app.js`, `admin.js`.
3. Jeśli panel wymaga archiwum, spakuj te pliki do ZIP i wgraj go. Nie wgrywaj `README.md` ani plików SQL jako strony.
4. Po publikacji otwórz adres `*.pages.dev`, sprawdź katalog i panel administratora. Zabezpiecz konto Cloudflare uwierzytelnianiem dwuskładnikowym.

## Jak dodać 1000+ części
Wchodź na `https://TWOJ-ADRES.pages.dev/admin.html`, zaloguj się i uzupełnij formularz. Na początku dodawanie ręczne jest możliwe; przy tysiącach pozycji warto dodać import CSV/XLSX w kolejnym kroku. Przed masowym importem przygotuj arkusz z kolumnami: `name, category, make, model, years, oem, price, status, description, image_url`.

## Uwaga o kosztach i zdjęciach
Bezpłatne plany mają limity bazy, transferu i plików oraz mogą mieć ograniczenia nieaktywności. Przykładowo Supabase Free oferuje obecnie 500 MB bazy i 1 GB plików; przy tysiącach zdjęć trzeba mocno kompresować obrazy albo zaplanować dodatkowe miejsce. Sprawdź aktualne warunki przed uruchomieniem biznesowym. Hosting darmowy nie oznacza gwarancji nieprzerwanej dostępności.

## Bezpieczeństwo i dalsze usprawnienia
- Nie udostępniaj nikomu hasła administratora.
- RLS ogranicza zapis do zalogowanych użytkowników. Na razie każda zalogowana osoba może edytować produkty, dlatego nie dodawaj dodatkowych kont administratorów bez potrzeby.
- Przed rzeczywistym użyciem skonfiguruj kopię zapasową/eksport katalogu.
- Następne rozsądne kroki: import CSV, numery magazynowe, filtrowanie po marce/modelu/roczniku, SEO i strony szczegółów produktów.
