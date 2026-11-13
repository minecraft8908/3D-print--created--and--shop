# forma/druk — kreator modeli 3D

Statyczna, polskojęzyczna strona do tworzenia prostych modeli 3D, eksportu STL i wysyłania zapytań o wycenę przez Netlify Forms.

## Funkcje

- Interaktywny podgląd 3D (obracanie i przybliżanie).
- Trzy modele startowe: brelok, tabliczka i podstawka.
- Regulacja szerokości, głębokości, grubości i koloru podglądu.
- Eksport aktualnego modelu do binarnego pliku STL.
- Formularz Netlify Forms dołączający aktualnie wygenerowany STL.

## Publikacja na Netlify

1. W Netlify wybierz **Add new site → Import an existing project** i połącz repozytorium `minecraft8908/3D-print--created--and--shop`.
2. Ustaw branch `main`, katalog publikacji `.` i pozostaw komendę build pustą. Konfiguracja katalogu publikacji jest również w `netlify.toml`.
3. Wdróż witrynę. Netlify wykryje formularz `wycena-3d` podczas deployu.
4. W panelu witryny otwórz **Forms** i włącz obsługę formularzy, jeśli panel o to poprosi. Następnie dodaj powiadomienie e-mail dla formularza `wycena-3d` w ustawieniach powiadomień.

Formularze Netlify przesyłają plik STL do zgłoszenia; wiadomość powiadamiająca może zawierać odnośnik do zgłoszenia/pliku, a nie sam plik jako załącznik. Pliki są przesyłane dopiero po wdrożeniu witryny na Netlify — lokalny podgląd strony nie przyjmuje formularzy.

## Test lokalny

Uruchom lokalny serwer HTTP, np. `python -m http.server 8000`, i otwórz `http://localhost:8000`. Podgląd 3D wymaga połączenia z internetem, ponieważ Three.js jest ładowany z CDN. Wysyłka formularza działa na opublikowanej witrynie Netlify.

## Uwaga o modelach

Edytor tworzy proste modele bazowe o wymiarach w milimetrach. Modele służą jako punkt wyjścia do wyceny; przed produkcją warto sprawdzić geometrię w slicerze i potwierdzić wymiary oraz wykonalność wydruku.
