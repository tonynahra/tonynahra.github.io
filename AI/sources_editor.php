<?php
session_start();
$jsonFile = 'sources.json';
$message = "";
$error = "";

// --- 1. HANDLE LOGIN ---
if (isset($_POST['action']) && $_POST['action'] === 'login') {
    if ($_POST['password'] === 'MM') {
        $_SESSION['logged_in'] = true;
    } else {
        $error = "Incorrect Password";
    }
}

// --- 2. HANDLE LOGOUT ---
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: editor.php");
    exit;
}

// --- 3. HANDLE SAVE ---
if (isset($_POST['action']) && $_POST['action'] === 'save' && isset($_SESSION['logged_in'])) {
    $data = json_decode(file_get_contents($jsonFile), true);
    $providerIndex = $_POST['provider_index'];
    
    if (isset($data['providers'][$providerIndex])) {
        // Update simple fields
        $p = &$data['providers'][$providerIndex];
        $p['name'] = $_POST['name'];
        $p['docs'] = $_POST['docs'];
        $p['cost'] = $_POST['cost'];
        $p['limits'] = $_POST['limits'];
        $p['endpoint'] = $_POST['endpoint'];
        $p['authType'] = $_POST['authType'];

        // Update Arrays (Split by new lines)
        $p['models'] = array_filter(array_map('trim', explode("\n", $_POST['models'])));
        $p['capabilities'] = array_filter(array_map('trim', explode(",", $_POST['capabilities'])));

        // Update JSON fields
        $testBody = json_decode($_POST['testBody'], true);
        if ($testBody) $p['testBody'] = $testBody;

        $customHeaders = json_decode($_POST['customHeaders'], true);
        if ($customHeaders) $p['customHeaders'] = $customHeaders;
        else unset($p['customHeaders']); // Remove if empty/invalid

        // Save back to file
        if (file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT))) {
            $message = "Configuration saved successfully!";
        } else {
            $error = "Failed to write to sources.json. Check permissions.";
        }
    }
}

// Load Data for View
$jsonData = file_exists($jsonFile) ? json_decode(file_get_contents($jsonFile), true) : ['providers' => []];
$providers = $jsonData['providers'];

// Determine Active Provider
$activeIndex = isset($_REQUEST['provider_index']) ? $_REQUEST['provider_index'] : 0;
$activeProvider = isset($providers[$activeIndex]) ? $providers[$activeIndex] : null;

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON Config Editor</title>
    <style>
        :root { --bg:#f8fafc; --surface:#ffffff; --text:#334155; --primary:#2563eb; --border:#cbd5e1; }
        body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 40px; }
        
        .container { max-width: 800px; margin: 0 auto; background: var(--surface); padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; color: #1e293b; }
        
        /* Form Elements */
        label { display: block; font-weight: 600; margin-bottom: 5px; font-size: 14px; color: #475569; }
        input[type="text"], input[type="password"], select, textarea { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box; margin-bottom: 15px; font-family: inherit; }
        textarea { font-family: monospace; font-size: 13px; height: 100px; }
        
        /* Buttons */
        .btn { padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
        .btn:hover { background: #1d4ed8; }
        .btn-logout { background: #64748b; float: right; font-size: 12px; padding: 6px 12px; text-decoration: none; color: white; border-radius: 4px; }
        
        /* Login Box */
        .login-box { max-width: 400px; margin: 100px auto; text-align: center; }
        
        /* Messages */
        .msg { padding: 10px; border-radius: 6px; margin-bottom: 20px; font-weight: 500; }
        .msg.success { background: #dcfce7; color: #166534; }
        .msg.error { background: #fee2e2; color: #991b1b; }

        /* Provider Selector */
        .selector-area { background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bfdbfe; }
        select.big-select { font-size: 18px; padding: 12px; font-weight: bold; color: #1e3a8a; border-color: #3b82f6; cursor: pointer; }

        .row { display: flex; gap: 20px; }
        .col { flex: 1; }
    </style>
</head>
<body>

<?php if (!isset($_SESSION['logged_in'])): ?>
    <div class="container login-box">
        <h1>🔐 Admin Login</h1>
        <?php if($error): ?><div class="msg error"><?= $error ?></div><?php endif; ?>
        <form method="POST">
            <input type="hidden" name="action" value="login">
            <input type="password" name="password" placeholder="Enter Password" autofocus>
            <button class="btn">Login</button>
        </form>
    </div>

<?php else: ?>
    <div class="container">
        <a href="?logout=1" class="btn-logout">Logout</a>
        <h1>🛠️ Provider Editor</h1>
        
        <?php if($message): ?><div class="msg success"><?= $message ?></div><?php endif; ?>
        <?php if($error): ?><div class="msg error"><?= $error ?></div><?php endif; ?>

        <div class="selector-area">
            <label>Select Provider to Edit:</label>
            <form method="GET">
                <select name="provider_index" class="big-select" onchange="this.form.submit()">
                    <?php foreach($providers as $idx => $p): ?>
                        <option value="<?= $idx ?>" <?= $idx == $activeIndex ? 'selected' : '' ?>>
                            <?= htmlspecialchars($p['name']) ?> (<?= htmlspecialchars($p['id']) ?>)
                        </option>
                    <?php endforeach; ?>
                </select>
            </form>
        </div>

        <?php if($activeProvider): ?>
        <form method="POST">
            <input type="hidden" name="action" value="save">
            <input type="hidden" name="provider_index" value="<?= $activeIndex ?>">

            <div class="row">
                <div class="col">
                    <label>Provider Name</label>
                    <input type="text" name="name" value="<?= htmlspecialchars($activeProvider['name']) ?>">
                </div>
                <div class="col">
                    <label>Docs URL</label>
                    <input type="text" name="docs" value="<?= htmlspecialchars($activeProvider['docs'] ?? '') ?>">
                </div>
            </div>

            <div class="row">
                <div class="col">
                    <label>Cost Description</label>
                    <input type="text" name="cost" value="<?= htmlspecialchars($activeProvider['cost'] ?? '') ?>">
                </div>
                <div class="col">
                    <label>Limits Description</label>
                    <input type="text" name="limits" value="<?= htmlspecialchars($activeProvider['limits'] ?? '') ?>">
                </div>
            </div>

            <label>API Endpoint</label>
            <input type="text" name="endpoint" value="<?= htmlspecialchars($activeProvider['endpoint']) ?>">

            <label>Auth Type (bearer, query, header-custom)</label>
            <select name="authType">
                <option value="bearer" <?= $activeProvider['authType'] == 'bearer' ? 'selected' : '' ?>>Bearer Token</option>
                <option value="query" <?= $activeProvider['authType'] == 'query' ? 'selected' : '' ?>>Query Param (?key=)</option>
                <option value="header-custom" <?= $activeProvider['authType'] == 'header-custom' ? 'selected' : '' ?>>Custom Header (x-api-key)</option>
            </select>

            <div class="row">
                <div class="col">
                    <label>Capabilities (comma separated)</label>
                    <textarea name="capabilities"><?= htmlspecialchars(implode(', ', $activeProvider['capabilities'] ?? [])) ?></textarea>
                </div>
                <div class="col">
                    <label>Models (one per line)</label>
                    <textarea name="models" style="height: 150px;"><?= htmlspecialchars(implode("\n", $activeProvider['models'] ?? [])) ?></textarea>
                </div>
            </div>

            <div class="row">
                <div class="col">
                    <label>Test Body (JSON)</label>
                    <textarea name="testBody"><?= htmlspecialchars(json_encode($activeProvider['testBody'] ?? new stdClass(), JSON_PRETTY_PRINT)) ?></textarea>
                </div>
                <div class="col">
                    <label>Custom Headers (JSON)</label>
                    <textarea name="customHeaders"><?= htmlspecialchars(json_encode($activeProvider['customHeaders'] ?? new stdClass(), JSON_PRETTY_PRINT)) ?></textarea>
                </div>
            </div>

            <div style="margin-top: 20px; text-align: right;">
                <button class="btn" style="width: 200px; font-size: 16px;">💾 Save Changes</button>
            </div>
        </form>
        <?php endif; ?>

    </div>
<?php endif; ?>

</body>
</html>
