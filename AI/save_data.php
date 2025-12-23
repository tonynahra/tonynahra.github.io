<?php
// save_data.php
header('Content-Type: application/json');

// Security check: Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Get the raw POST data
$input = file_get_contents('php://input');
$newData = json_decode($input, true);

if (!$newData || !isset($newData['providers'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON structure']);
    exit;
}

$file = 'sources.json';

// Create backup (optional but recommended)
if (file_exists($file)) {
    copy($file, $file . '.bak');
}

// Write the new data back to sources.json
if (file_put_contents($file, json_encode($newData, JSON_PRETTY_PRINT))) {
    echo json_encode(['status' => 'success', 'message' => 'File saved successfully']);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to write to file. Check permissions.']);
}
?>
