/**
 * Financial Tools Library
 * * This library uses D3.js to render financial tables and charts.
 * Make sure you have included D3.js in your index.html:
 * <script src="https://d3js.org/d3.v7.min.js"></script>
 */

/**
 * Main public function to render data.
 * @param {string} containerId - The ID of the div where the chart/table will be built.
 * @param {string} jsonUrl - The URL of the JSON data file.
 * @param {string} type - The type of render ('yearlyReturnsTable', 'balanceSheetTable', 'stockChart').
 */
function renderFinancialData(containerId, jsonUrl, type) {
    const $container = $(`#${containerId}`);
    if (!$container.length) {
        console.error(`Financial Tools: Container #${containerId} not found.`);
        return;
    }
    
    $container.html('<div class="content-loader"><div class="spinner"></div></div>');

    $.getJSON(jsonUrl, function (data) {
        $container.empty(); // Clear spinner
        switch (type) {
            case 'yearlyReturnsTable':
                renderReturnsTable($container, data);
                break;
            case 'balanceSheetTable':
                renderBalanceSheet($container, data);
                break;
            case 'stockChart':
                renderStockChart($container, data);
                break;
            default:
                $container.html(`<p class="error-message">Unknown financial data type: ${type}</p>`);
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        $container.html(`<p class="error-message">Failed to load financial data: ${errorThrown}</p>`);
    });
}

/**
 * Renders a "Yearly Returns" table.
 * @param {jQuery} $container - The jQuery object of the container div.
 * @param {object} data - The parsed JSON data.
 */
function renderReturnsTable($container, data) {
    const headers = data.headers;
    const tickers = data.returns;

    let table = '<table class="financial-table">';
    
    // Add Header Row
    table += '<thead><tr>';
    headers.forEach(h => table += `<th>${h}</th>`);
    table += '</tr></thead>';
    
    // Add Body Rows
    table += '<tbody>';
    tickers.forEach(ticker => {
        table += '<tr>';
        headers.forEach(header => {
            const val = ticker[header.toLowerCase()] || 'N/A';
            let cellClass = '';
            // Add color for return cells
            if (header !== 'Ticker') {
                const numVal = parseFloat(val);
                if (numVal > 0) cellClass = 'positive';
                else if (numVal < 0) cellClass = 'negative';
            }
            table += `<td class="${cellClass}">${val}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';
    
    $container.html(table);
}

/**
 * Renders a "Balance Sheet" summary table.
 * @param {jQuery} $container - The jQuery object of the container div.
 * @param {object} data - The parsed JSON data.
 */
function renderBalanceSheet($container, data) {
    let table = `<h3 class="financial-title">${data.title}</h3>`;
    table += '<table class="financial-table balance-sheet">';
    
    table += '<tbody>';
    data.items.forEach(item => {
        table += '<tr>';
        table += `<td>${item.metric}</td>`;
        table += `<td>${item.value}</td>`;
        table += '</tr>';
    });
    table += '</tbody></table>';
    
    $container.html(table);
}

/**
 * Renders a "Stock Chart" with Price, Volume, and RSI.
 * @param {jQuery} $container - The jQuery object of the container div.
 * @param {object} data - The parsed JSON data.
 */
function renderStockChart($container, data) {
    // 1. Setup Chart Dimensions
    const containerWidth = $container.width();
    if (containerWidth < 100) {
        console.warn("Chart container is too small, skipping render.");
        return;
    }
    const margin = { top: 20, right: 50, bottom: 30, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    
    const height = Math.min(containerWidth * 0.6, 600); // Max height 600px
    const mainChartHeight = height * 0.6;
    const volumeChartHeight = height * 0.2;
    const rsiChartHeight = height * 0.2;
    const chartSpacing = 30;

    // 2. Parse Data
    const parseDate = d3.timeParse("%Y-%m-%d");
    const dataPoints = data.dataPoints.map(d => ({
        date: parseDate(d.date),
        close: +d.close,
        volume: +d.volume,
        rsi: +d.rsi
    }));

    // 3. Create SVG Container
    const svg = d3.select($container.get(0))
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + (chartSpacing * 2)) // Add space for 2 gaps
        .attr("class", "stock-chart")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 4. Create Scales
    const x = d3.scaleTime()
        .domain(d3.extent(dataPoints, d => d.date))
        .range([0, width]);
        
    const yPrice = d3.scaleLinear()
        .domain(d3.extent(dataPoints, d => d.close))
        .range([mainChartHeight, 0]);
        
    const yVolume = d3.scaleLinear()
        .domain([0, d3.max(dataPoints, d => d.volume)])
        .range([volumeChartHeight, 0]);
        
    const yRSI = d3.scaleLinear()
        .domain([0, 100]) // RSI is always 0-100
        .range([rsiChartHeight, 0]);

    // 5. Create Axes
    const xAxis = d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%b %Y"));
    const yPriceAxis = d3.axisRight(yPrice).ticks(5).tickFormat(d => `$${d}`);
    const yVolumeAxis = d3.axisRight(yVolume).ticks(2).tickFormat(d3.format("~s"));
    const yRSIAxis = d3.axisRight(yRSI).ticks(3).tickValues([30, 50, 70]);

    // 6. Define Line/Area Generators
    const priceLine = d3.line()
        .x(d => x(d.date))
        .y(d => yPrice(d.close));

    // 7. Draw Main Price Chart
    const mainChart = svg.append("g")
        .attr("class", "price-chart");

    mainChart.append("path")
        .datum(dataPoints)
        .attr("fill", "none")
        .attr("stroke", "var(--text-accent)")
        .attr("stroke-width", 2)
        .attr("d", priceLine);

    mainChart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${mainChartHeight})`)
        .call(xAxis);

    mainChart.append("g")
        .attr("class", "y-axis price-axis")
        .attr("transform", `translate(${width}, 0)`)
        .call(yPriceAxis);
        
    mainChart.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("class", "chart-title")
        .text(`${data.title} - Price`);

    // 8. Draw Volume Chart
    const volumeChart = svg.append("g")
        .attr("class", "volume-chart")
        .attr("transform", `translate(0, ${mainChartHeight + chartSpacing})`);

    volumeChart.selectAll(".bar")
        .data(dataPoints)
        .enter().append("rect")
        .attr("class", "volume-bar")
        .attr("x", d => x(d.date) - (width/dataPoints.length/2) * 0.8)
        .attr("y", d => yVolume(d.volume))
        .attr("width", (width / dataPoints.length) * 0.8)
        .attr("height", d => volumeChartHeight - yVolume(d.volume));

    volumeChart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${volumeChartHeight})`)
        .call(xAxis);

    volumeChart.append("g")
        .attr("class", "y-axis volume-axis")
        .attr("transform", `translate(${width}, 0)`)
        .call(yVolumeAxis);
        
    volumeChart.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("class", "chart-title")
        .text("Volume");

    // 9. Draw RSI Chart
    const rsiChart = svg.append("g")
        .attr("class", "rsi-chart")
        .attr("transform", `translate(0, ${mainChartHeight + volumeChartHeight + (chartSpacing * 2)})`);
        
    // Add overbought/oversold lines
    rsiChart.append("line")
        .attr("class", "rsi-line rsi-over")
        .attr("x1", 0).attr("x2", width)
        .attr("y1", yRSI(70)).attr("y2", yRSI(70));
    rsiChart.append("line")
        .attr("class", "rsi-line rsi-over")
        .attr("x1", 0).attr("x2", width)
        .attr("y1", yRSI(30)).attr("y2", yRSI(30));

    rsiChart.append("path")
        .datum(dataPoints)
        .attr("fill", "none")
        .attr("stroke", "#e67e22")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line().x(d => x(d.date)).y(d => yRSI(d.rsi)));

    rsiChart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${rsiChartHeight})`)
        .call(xAxis);
        
    rsiChart.append("g")
        .attr("class", "y-axis rsi-axis")
        .attr("transform", `translate(${width}, 0)`)
        .call(yRSIAxis);

    rsiChart.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("class", "chart-title")
        .text("RSI (14)");
        
    // Style all axes
    svg.selectAll(".x-axis path, .y-axis path, .x-axis .tick line, .y-axis .tick line")
        .attr("stroke", "var(--bg-medium)");
    svg.selectAll("text")
        .attr("fill", "var(--text-light)");
    svg.selectAll(".chart-title")
        .attr("fill", "var(--text-primary)");
    svg.selectAll(".rsi-line")
        .attr("stroke", "var(--text-light)")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "2 2");
    svg.selectAll(".volume-bar")
        .attr("fill", "var(--text-light)")
        .attr("opacity", 0.6);
}


/* --- NEW: Generic JSON to HTML Table Function --- */

/**
 * Renders a generic table from a JSON URL with formatting.
 * @param {string} containerId - The ID of the div where the table will be built.
 * @param {string} jsonUrl - The URL of the JSON data file.
 */
function renderGenericTableFromUrl(containerId, jsonUrl) {
    const $container = $(`#${containerId}`);
    if (!$container.length) {
        console.error(`Financial Tools: Container #${containerId} not found.`);
        return;
    }
    
    $container.html('<div class="content-loader"><div class="spinner"></div></div>');

    $.getJSON(jsonUrl, function (jsonData) {
        $container.empty(); // Clear spinner
        
        // Call the internal table builder
        const tableHtml = buildGenericTable(jsonData);
        $container.html(tableHtml);

    }).fail(function(jqXHR, textStatus, errorThrown) {
        $container.html(`<p class="error-message">Failed to load table data: ${errorThrown}</p>`);
    });
}

/**
 * Internal function to build an HTML table from a JSON object with metadata.
 * @param {object} jsonData - A JSON object { title, columns, data }.
 * @returns {string} - The complete HTML table string.
 */
function buildGenericTable(jsonData) {
    const { title, columns, data } = jsonData;
    
    if (!columns || !data || !Array.isArray(data) || !Array.isArray(columns)) {
        return '<p class="error-message">Invalid JSON data for table.</p>';
    }

    let table = '';
    if (title) {
        table += `<h3 class="financial-title">${title}</h3>`;
    }
    
    table += '<table class="financial-table generic-table">';
    
    // Add Header Row
    table += '<thead><tr>';
    columns.forEach(col => {
        const align = col.align || 'left';
        table += `<th class="align-${align}">${col.label}</th>`;
    });
    table += '</tr></thead>';
    
    // Add Body Rows
    table += '<tbody>';
    data.forEach(row => {
        table += '<tr>';
        columns.forEach(col => {
            const val = row[col.key] !== null && row[col.key] !== undefined ? row[col.key] : 'N/A';
            const align = col.align || 'left';
            const formattedVal = formatCell(val, col);
            table += `<td class="align-${align}">${formattedVal}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';
    
    return table;
}

/**
 * Helper to format cell data based on column config.
 * @param {*} value - The raw cell value.
 * @param {object} col - The column configuration object.
 * @returns {string} - The formatted HTML string for the cell.
 */
function formatCell(value, col) {
    let numVal = parseFloat(value);
    
    // Return 'N/A' if value is invalid for a formatted column
    if (col.format && isNaN(numVal)) {
        return 'N/A';
    }
    
    // Get decimal places, default to 2 if format exists but no decimals set
    const decimals = col.decimals !== undefined ? col.decimals : 2;

    switch (col.format) {
        case 'percent':
            return (numVal * 100).toFixed(decimals) + '%';
        case 'currency':
            return '$' + numVal.toFixed(decimals);
        case 'number':
            return numVal.toFixed(decimals);
        default:
            return value; // Return original value if no format
    }
}
