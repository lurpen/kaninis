<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson([
        'success' => false,
        'error' => 'Method not allowed',
    ], 405);
}

requireApiKey();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    sendJson([
        'success' => false,
        'error' => 'Invalid JSON',
    ], 400);
}

$name = trim((string)($input['name'] ?? ''));
$score = $input['score'] ?? null;

if ($name === '' || mb_strlen($name) > 50) {
    sendJson([
        'success' => false,
        'error' => 'Name must be between 1 and 50 characters',
    ], 400);
}

if (!is_int($score) && !ctype_digit((string)$score)) {
    sendJson([
        'success' => false,
        'error' => 'Score must be an integer',
    ], 400);
}

$score = (int)$score;

if ($score < 0) {
    sendJson([
        'success' => false,
        'error' => 'Score must be 0 or higher',
    ], 400);
}

try {
    $pdo = getPdo();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO leaderboard (player_name, score) VALUES (:player_name, :score)');
    $stmt->execute([
        'player_name' => $name,
        'score' => $score,
    ]);

    $deleteSql = "
        DELETE FROM leaderboard
        WHERE id NOT IN (
            SELECT id
            FROM (
                SELECT id
                FROM leaderboard
                ORDER BY score DESC, created_at ASC
                LIMIT 10
            ) AS top10
        )
    ";

    $pdo->exec($deleteSql);
    $pdo->commit();

    sendJson([
        'success' => true,
        'message' => 'Score saved',
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    sendJson([
        'success' => false,
        'error' => 'Server error',
    ], 500);
}