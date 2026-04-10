<?php

declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'game_db';
const DB_USER = 'root';
const DB_PASS = 'your_password';

const API_KEY = 'byt-till-en-hemlig-api-nyckel';

function getPdo(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    return $pdo;
}

function sendJson(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireApiKey(): void
{
    $providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

    if ($providedKey !== API_KEY) {
        sendJson([
            'success' => false,
            'error' => 'Unauthorized',
        ], 401);
    }
}