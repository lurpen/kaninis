# Kaninis Leaderboard API

**Bas-URL:** `https://isaksson.tk/kaninis/`

Det här API:t används för att:

* spara spelarens namn och poäng
* hämta leaderboard
* visa de 10 bästa resultaten

API:t skyddas med en **API key** som skickas i headern.

---

## Autentisering

Alla anrop måste innehålla headern:

```http
X-API-KEY: din-hemliga-api-nyckel
```

Exempel:

```http
X-API-KEY: abc123supersecret
```

Om API-nyckeln saknas eller är felaktig returneras:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

med statuskod `401 Unauthorized`.

---

## Endpoints

## 1. Skicka in poäng

Sparar en spelares namn och poäng. Efter att poängen sparats behåller systemet bara de 10 bästa resultaten.

### Endpoint

```http
POST https://isaksson.tk/kaninis/submit_score.php
```

### Headers

```http
Content-Type: application/json
X-API-KEY: din-hemliga-api-nyckel
```

### Request body

```json
{
  "name": "Henrik",
  "score": 123
}
```

### Fält

`name`
Spelarens namn. Måste vara mellan 1 och 50 tecken.

`score`
Spelarens poäng. Måste vara ett heltal som är 0 eller högre.

### Exempel med curl

```bash
curl -X POST "https://isaksson.tk/kaninis/submit_score.php" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: din-hemliga-api-nyckel" \
  -d '{"name":"Henrik","score":123}'
```

### Exempel på lyckat svar

```json
{
  "success": true,
  "message": "Score saved"
}
```

### Möjliga fel

#### Ogiltig metod

Om du använder något annat än `POST`:

```json
{
  "success": false,
  "error": "Method not allowed"
}
```

Statuskod: `405 Method Not Allowed`

#### Ogiltig JSON

```json
{
  "success": false,
  "error": "Invalid JSON"
}
```

Statuskod: `400 Bad Request`

#### Ogiltigt namn

```json
{
  "success": false,
  "error": "Name must be between 1 and 50 characters"
}
```

Statuskod: `400 Bad Request`

#### Ogiltig poäng

```json
{
  "success": false,
  "error": "Score must be an integer"
}
```

eller:

```json
{
  "success": false,
  "error": "Score must be 0 or higher"
}
```

Statuskod: `400 Bad Request`

#### Serverfel

```json
{
  "success": false,
  "error": "Server error"
}
```

Statuskod: `500 Internal Server Error`

---

## 2. Hämta leaderboard

Hämtar de 10 bästa resultaten, sorterade efter högst poäng först.

### Endpoint

```http
GET https://isaksson.tk/kaninis/get_leaderboard.php
```

### Headers

```http
X-API-KEY: din-hemliga-api-nyckel
```

### Exempel med curl

```bash
curl "https://isaksson.tk/kaninis/get_leaderboard.php" \
  -H "X-API-KEY: din-hemliga-api-nyckel"
```

### Exempel på lyckat svar

```json
{
  "success": true,
  "leaderboard": [
    {
      "player_name": "Henrik",
      "score": 123,
      "created_at": "2026-04-10 14:30:00"
    },
    {
      "player_name": "Anna",
      "score": 110,
      "created_at": "2026-04-10 14:20:00"
    }
  ]
}
```

### Svarsfält

`player_name`
Spelarens namn.

`score`
Spelarens poäng.

`created_at`
Tidpunkt då resultatet sparades.

### Möjliga fel

#### Ogiltig metod

Om du använder något annat än `GET`:

```json
{
  "success": false,
  "error": "Method not allowed"
}
```

Statuskod: `405 Method Not Allowed`

#### Fel API key

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

Statuskod: `401 Unauthorized`

#### Serverfel

```json
{
  "success": false,
  "error": "Server error"
}
```

Statuskod: `500 Internal Server Error`

---

## Sortering

Leaderboarden sorteras enligt följande:

1. högst `score` först
2. om två spelare har samma poäng visas det äldsta resultatet först

Det betyder att om flera spelare har samma poäng får den som nådde poängen först bättre placering.

---

## Begränsningar

* endast de **10 bästa** resultaten sparas
* namn får vara max **50 tecken**
* poäng måste vara ett heltal och minst **0**
* alla requests måste innehålla giltig **API key**

---

## Snabbguide för integration

### Skicka in resultat från spelklienten

1. När spelet är slut, samla in spelarens namn och poäng
2. Skicka en `POST`-request till `/submit_score.php`
3. Skicka med JSON-body och `X-API-KEY`
4. Kontrollera att svaret innehåller `"success": true`

### Visa topplistan i spelet

1. Skicka en `GET`-request till `/get_leaderboard.php`
2. Skicka med `X-API-KEY`
3. Läs arrayen `leaderboard`
4. Visa namn och poäng i spelets UI

---

## Kompletta exempel

### JavaScript: spara score

```javascript
fetch("https://isaksson.tk/kaninis/submit_score.php", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-KEY": "din-hemliga-api-nyckel"
  },
  body: JSON.stringify({
    name: "Henrik",
    score: 123
  })
})
  .then(response => response.json())
  .then(data => {
    console.log(data);
  });
```

### JavaScript: hämta leaderboard

```javascript
fetch("https://isaksson.tk/kaninis/get_leaderboard.php", {
  method: "GET",
  headers: {
    "X-API-KEY": "din-hemliga-api-nyckel"
  }
})
  .then(response => response.json())
  .then(data => {
    console.log(data.leaderboard);
  });
```

---

## Statuskoder

`200 OK`
Anropet lyckades.

`400 Bad Request`
Felaktig input.

`401 Unauthorized`
API key saknas eller är fel.

`405 Method Not Allowed`
Fel HTTP-metod användes.

`500 Internal Server Error`
Något gick fel på servern.

---
