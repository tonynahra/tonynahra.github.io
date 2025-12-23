<?php
// save_data.php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;

$input = file_get_contents('php://input');
$newData = json_decode($input, true);

if (!$newData || !isset($newData['providers'])) {
    echo json_encode(['status' => 'error']);
    exit;
}

// SAFETY: Strip any "key" fields just in case frontend sends them
foreach ($newData['providers'] as &$p) {
    unset($p['key']); 
}

file_put_contents('sources.json', json_encode($newData, JSON_PRETTY_PRINT));
echo json_encode(['status' => 'success']);
?>
