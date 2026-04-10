<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJson([
        'success' => false,
        'error' => 'Method not allowed',
    ], 405);
}

requireApiKey();

try {
    $pdo = getPdo();

    $stmt = $pdo->query("
        SELECT player_name, score, created_at
        FROM leaderboard
        ORDER BY score DESC, created_at ASC
        LIMIT 10
    ");

    $rows = $stmt->fetchAll();

    sendJson([
        'success' => true,
        'leaderboard' => $rows,
    ]);
} catch (Throwable $e) {
    sendJson([
        'success' => false,
        'error' => 'Server error',
    ], 500);
}