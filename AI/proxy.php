<?php
// proxy.php
header('Content-Type: application/json');

// 1. INPUT VALIDATION
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['provider_id']) || !isset($input['model'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing provider_id or model']);
    exit;
}

$pid = $input['provider_id'];
$model = $input['model'];
$requestBody = $input['body'] ?? [];

// 2. LOAD CONFIGS
$keys = require 'config.php';
$sources = json_decode(file_get_contents('sources.json'), true);

// 3. FIND PROVIDER DETAILS
$providerConfig = null;
foreach ($sources['providers'] as $p) {
    if ($p['id'] === $pid) {
        $providerConfig = $p;
        break;
    }
}

if (!$providerConfig) {
    echo json_encode(['error' => 'Provider not found in sources.json']);
    exit;
}

if (!isset($keys[$pid]) || empty($keys[$pid])) {
    echo json_encode(['error' => 'API Key not configured in config.php']);
    exit;
}

$apiKey = $keys[$pid];

// 4. PREPARE REQUEST
$url = str_replace('{model}', $model, $providerConfig['endpoint']);
$headers = ['Content-Type: application/json'];

// Handle Auth Types
if ($providerConfig['authType'] === 'bearer') {
    $headers[] = "Authorization: Bearer $apiKey";
} 
elseif ($providerConfig['authType'] === 'query') {
    $url = str_replace('{key}', $apiKey, $url);
} 
elseif ($providerConfig['authType'] === 'header-custom') {
    // Anthropic specific
    $headers[] = "x-api-key: $apiKey";
    if (isset($providerConfig['customHeaders'])) {
        foreach ($providerConfig['customHeaders'] as $k => $v) {
            $headers[] = "$k: $v";
        }
    }
}

// 5. EXECUTE CURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo json_encode(['error' => 'Curl error: ' . curl_error($ch)]);
} else {
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>
