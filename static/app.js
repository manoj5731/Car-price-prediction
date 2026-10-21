/**
 * AutoValuate AI — Interactive Client Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Sliders & Inputs
    const priceSlider = document.getElementById('present-price-slider');
    const priceInput = document.getElementById('present-price-input');
    const priceDisplay = document.getElementById('present-price-display');

    const yearSlider = document.getElementById('year-slider');
    const yearInput = document.getElementById('year-input');
    const yearDisplay = document.getElementById('year-display');
    const carAgeBadge = document.getElementById('car-age-badge');

    const kmsSlider = document.getElementById('kms-slider');
    const kmsInput = document.getElementById('kms-input');
    const kmsDisplay = document.getElementById('kms-display');

    // Action buttons
    const recalculateBtn = document.getElementById('recalculate-btn');
    const randomizeBtn = document.getElementById('randomize-btn');
    const retrainBtn = document.getElementById('retrain-model-btn');
    const retrainBtnText = document.getElementById('retrain-btn-text');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // Results DOM
    const predictedPriceNumber = document.getElementById('predicted-price-number');
    const priceRangeText = document.getElementById('price-range-text');
    const retentionPctText = document.getElementById('retention-pct-text');
    const depreciationPctText = document.getElementById('depreciation-pct-text');
    const dealRatingBadge = document.getElementById('deal-rating-badge');
    const projectionPills = document.getElementById('projection-pills');
    const depreciationCanvas = document.getElementById('depreciation-canvas');
    const driverBarsList = document.getElementById('driver-bars-list');
    const benchmarkTableBody = document.getElementById('benchmark-table-body');

    // Debounce timer
    let predictDebounceTimer = null;
    let currentDisplayedPrice = 5.85;

    // ----------------------------------------------------
    // Synchronize Dual Controls (Slider <-> Number Input)
    // ----------------------------------------------------
    function syncDualControls(slider, input, display, formatter) {
        slider.addEventListener('input', () => {
            input.value = slider.value;
            if (display) display.textContent = formatter ? formatter(slider.value) : slider.value;
            triggerLivePrediction();
        });

        input.addEventListener('input', () => {
            slider.value = input.value;
            if (display) display.textContent = formatter ? formatter(input.value) : input.value;
            triggerLivePrediction();
        });
    }

    // Formatters
    const formatNumberComma = (val) => Number(val).toLocaleString();
    const updateYearAge = (yr) => {
        const age = 2024 - parseInt(yr);
        carAgeBadge.textContent = `${age} ${age === 1 ? 'Year' : 'Years'} Old`;
        return yr;
    };

    syncDualControls(priceSlider, priceInput, priceDisplay, (v) => parseFloat(v).toFixed(2));
    syncDualControls(yearSlider, yearInput, yearDisplay, updateYearAge);
    syncDualControls(kmsSlider, kmsInput, kmsDisplay, formatNumberComma);

    // Initial Year Age Label
    updateYearAge(yearSlider.value);

    // ----------------------------------------------------
    // Radio Group Pill Styling
    // ----------------------------------------------------
    function setupRadioGroup(selector, pillClass) {
        const container = document.querySelector(selector);
        if (!container) return;
        const labels = container.querySelectorAll(pillClass);
        labels.forEach(label => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio) {
                radio.addEventListener('change', () => {
                    labels.forEach(l => l.classList.remove('active'));
                    label.classList.add('active');
                    triggerLivePrediction();
                });
            }
        });
    }

    setupRadioGroup('#fuel-type-selector', '.pill-option');
    setupRadioGroup('#transmission-selector', '.seg-item');
    setupRadioGroup('#seller-selector', '.seg-item');
    setupRadioGroup('#owner-selector', '.owner-pill');

    // ----------------------------------------------------
    // Presets Click Handler
    // ----------------------------------------------------
    const presetCards = document.querySelectorAll('.preset-card');
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            presetCards.forEach(c => c.classList.remove('active-preset'));
            card.classList.add('active-preset');

            const price = parseFloat(card.dataset.price);
            const year = parseInt(card.dataset.year);
            const kms = parseInt(card.dataset.kms);
            const fuel = card.dataset.fuel;
            const trans = card.dataset.transmission;
            const seller = card.dataset.seller;

            // Set inputs
            priceSlider.value = price;
            priceInput.value = price;
            priceDisplay.textContent = price.toFixed(2);

            yearSlider.value = year;
            yearInput.value = year;
            yearDisplay.textContent = updateYearAge(year);

            kmsSlider.value = kms;
            kmsInput.value = kms;
            kmsDisplay.textContent = formatNumberComma(kms);

            // Set Fuel
            selectRadioByName('fuel_type', fuel);
            // Set Transmission
            selectRadioByName('transmission', trans);
            // Set Seller
            selectRadioByName('seller_type', seller);

            triggerLivePrediction(0);
        });
    });

    function selectRadioByName(name, value) {
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        radios.forEach(r => {
            if (r.value.toLowerCase() === value.toLowerCase()) {
                r.checked = true;
                const parent = r.closest('label');
                if (parent) {
                    const siblingLabels = parent.parentElement.querySelectorAll('label');
                    siblingLabels.forEach(l => l.classList.remove('active'));
                    parent.classList.add('active');
                }
            }
        });
    }

    // ----------------------------------------------------
    // Randomize Parameters
    // ----------------------------------------------------
    randomizeBtn.addEventListener('click', () => {
        const randPrice = (Math.random() * (25.0 - 2.5) + 2.5).toFixed(2);
        const randYear = Math.floor(Math.random() * (2023 - 2008 + 1)) + 2008;
        const randKms = Math.floor(Math.random() * 120 + 5) * 1000;
        const fuels = ['Petrol', 'Diesel'];
        const randFuel = fuels[Math.floor(Math.random() * fuels.length)];
        const transmissions = ['Manual', 'Automatic'];
        const randTrans = transmissions[Math.floor(Math.random() * transmissions.length)];
        const sellers = ['Dealer', 'Individual'];
        const randSeller = sellers[Math.floor(Math.random() * sellers.length)];
        const owners = ['0', '1'];
        const randOwner = owners[Math.floor(Math.random() * owners.length)];

        priceSlider.value = randPrice;
        priceInput.value = randPrice;
        priceDisplay.textContent = randPrice;

        yearSlider.value = randYear;
        yearInput.value = randYear;
        yearDisplay.textContent = updateYearAge(randYear);

        kmsSlider.value = randKms;
        kmsInput.value = randKms;
        kmsDisplay.textContent = formatNumberComma(randKms);

        selectRadioByName('fuel_type', randFuel);
        selectRadioByName('transmission', randTrans);
        selectRadioByName('seller_type', randSeller);
        selectRadioByName('owner', randOwner);

        presetCards.forEach(c => c.classList.remove('active-preset'));
        triggerLivePrediction(0);
    });

    // ----------------------------------------------------
    // Live Prediction Trigger (Debounced)
    // ----------------------------------------------------
    function triggerLivePrediction(delay = 180) {
        clearTimeout(predictDebounceTimer);
        predictDebounceTimer = setTimeout(fetchPrediction, delay);
    }

    recalculateBtn.addEventListener('click', () => fetchPrediction());

    async function fetchPrediction() {
        const form = document.getElementById('valuation-form');
        const formData = new FormData(form);

        const payload = {
            present_price: parseFloat(priceInput.value),
            year: parseInt(yearInput.value),
            kms_driven: parseInt(kmsInput.value),
            fuel_type: formData.get('fuel_type') || 'Petrol',
            seller_type: formData.get('seller_type') || 'Dealer',
            transmission: formData.get('transmission') || 'Manual',
            owner: parseInt(formData.get('owner') || '0')
        };

        try {
            const res = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Prediction API failed');
            const data = await res.json();
            renderPredictionResults(data);
        } catch (err) {
            console.error('Error fetching prediction:', err);
        }
    }

    // ----------------------------------------------------
    // Animate Number Counter
    // ----------------------------------------------------
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = (start + (end - start) * progress).toFixed(2);
            obj.innerHTML = current;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // ----------------------------------------------------
    // Render Prediction Output
    // ----------------------------------------------------
    function renderPredictionResults(data) {
        const newPrice = data.predicted_price_lakhs;
        animateValue(predictedPriceNumber, currentDisplayedPrice, newPrice, 400);
        currentDisplayedPrice = newPrice;

        priceRangeText.textContent = data.price_range_formatted;
        retentionPctText.textContent = `${data.value_retention_percent}%`;
        depreciationPctText.textContent = `${data.depreciation_percent}%`;

        // Deal rating badge
        dealRatingBadge.textContent = data.deal_rating;
        dealRatingBadge.style.color = data.rating_color;
        dealRatingBadge.style.borderColor = data.rating_color;
        dealRatingBadge.style.background = `${data.rating_color}1a`; // 10% opacity

        // Projection Pills
        if (data.projection && data.projection.length) {
            projectionPills.innerHTML = data.projection.map(p => `
                <div class="proj-pill">
                    <span class="proj-year">${p.projected_year}</span>
                    <span class="proj-price">₹${p.price_lakhs}L</span>
                </div>
            `).join('');

            // Draw Projection Chart Canvas
            drawDepreciationChart(data.projection);
        }
    }

    // ----------------------------------------------------
    // Draw 5-Year Depreciation Chart on HTML5 Canvas
    // ----------------------------------------------------
    function drawDepreciationChart(projection) {
        if (!depreciationCanvas) return;
        const ctx = depreciationCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = depreciationCanvas.getBoundingClientRect();

        depreciationCanvas.width = rect.width * dpr;
        depreciationCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        if (!projection || projection.length === 0) return;

        const padding = { top: 25, right: 30, bottom: 30, left: 45 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const prices = projection.map(p => p.price_lakhs);
        const maxPrice = Math.max(...prices) * 1.15;
        const minPrice = Math.max(0, Math.min(...prices) * 0.7);

        // Helper coordinates
        const getX = (index) => padding.left + (index / (projection.length - 1)) * chartW;
        const getY = (val) => padding.top + chartH - ((val - minPrice) / (maxPrice - minPrice || 1)) * chartH;

        // Draw horizontal grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        const gridSteps = 3;
        for (let i = 0; i <= gridSteps; i++) {
            const yVal = minPrice + (i / gridSteps) * (maxPrice - minPrice);
            const yCoord = getY(yVal);
            ctx.beginPath();
            ctx.moveTo(padding.left, yCoord);
            ctx.lineTo(width - padding.right, yCoord);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`₹${yVal.toFixed(1)}L`, padding.left - 6, yCoord + 3);
        }

        // Draw gradient area below curve
        const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        areaGradient.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
        areaGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        ctx.beginPath();
        projection.forEach((p, i) => {
            const x = getX(i);
            const y = getY(p.price_lakhs);
            if (i === 0) ctx.moveTo(x, y);
            else {
                const prevX = getX(i - 1);
                const prevY = getY(projection[i - 1].price_lakhs);
                const cpX = (prevX + x) / 2;
                ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
            }
        });
        ctx.lineTo(getX(projection.length - 1), padding.top + chartH);
        ctx.lineTo(getX(0), padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = areaGradient;
        ctx.fill();

        // Draw curve stroke
        ctx.beginPath();
        projection.forEach((p, i) => {
            const x = getX(i);
            const y = getY(p.price_lakhs);
            if (i === 0) ctx.moveTo(x, y);
            else {
                const prevX = getX(i - 1);
                const prevY = getY(projection[i - 1].price_lakhs);
                const cpX = (prevX + x) / 2;
                ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
            }
        });
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Points & Labels
        projection.forEach((p, i) => {
            const x = getX(i);
            const y = getY(p.price_lakhs);

            // Outer ring
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#6366f1';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // X-axis Year Labels
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.projected_year, x, height - 10);
        });
    }

    // ----------------------------------------------------
    // Load Model Metadata (Benchmark Table & Drivers)
    // ----------------------------------------------------
    async function loadMetadata() {
        try {
            const res = await fetch('/api/metadata');
            if (!res.ok) return;
            const meta = await res.json();
            renderMetadata(meta);
        } catch (err) {
            console.error('Error loading metadata:', err);
        }
    }

    function renderMetadata(meta) {
        if (!meta) return;

        // Render Benchmark Table
        if (meta.metrics) {
            const bestModel = meta.best_model;
            benchmarkTableBody.innerHTML = Object.entries(meta.metrics).map(([name, m]) => {
                const isWinner = name === bestModel;
                return `
                    <tr class="${isWinner ? 'winner-row' : ''}">
                        <td class="model-title-cell">
                            ${name}
                            ${isWinner ? '<span class="winner-badge">Active Model</span>' : ''}
                        </td>
                        <td class="score-highlight">${(m.R2 || 0).toFixed(4)}</td>
                        <td>₹ ${(m.MAE || 0).toFixed(3)} L</td>
                        <td>${(m.RMSE || 0).toFixed(3)}</td>
                        <td>
                            <span class="deal-badge ${isWinner ? 'badge-green' : ''}">
                                ${isWinner ? 'Optimal Weights' : 'Evaluated'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render Driver Bars
        if (meta.feature_importances) {
            const friendlyNames = {
                'Present_Price': 'Showroom / Original Price',
                'number_of_year': 'Vehicle Age',
                'Kms_Driven': 'Odometer Mileage',
                'Seller_Type_Individual': 'Individual vs Dealer Seller',
                'Fuel_Type_Diesel': 'Diesel Engine Variant',
                'Fuel_Type_Petrol': 'Petrol Engine Variant',
                'Transmission_Manual': 'Manual vs Auto Gearbox',
                'Owner': 'Previous Ownership Count'
            };

            const sorted = Object.entries(meta.feature_importances)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            driverBarsList.innerHTML = sorted.map(([feat, val]) => {
                const pct = (val * 100).toFixed(1);
                const title = friendlyNames[feat] || feat;
                return `
                    <div class="driver-row">
                        <div class="driver-info">
                            <span class="driver-label">${title}</span>
                            <span class="driver-val">${pct}%</span>
                        </div>
                        <div class="driver-track">
                            <div class="driver-fill" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // ----------------------------------------------------
    // Retrain Model Button
    // ----------------------------------------------------
    retrainBtn.addEventListener('click', async () => {
        retrainBtn.classList.add('loading');
        retrainBtnText.textContent = 'Retraining Pipeline...';

        try {
            const res = await fetch('/api/retrain', { method: 'POST' });
            const data = await res.json();
            if (data.status === 'success') {
                renderMetadata(data.metadata);
                // Refresh images with cache buster
                const featImg = document.getElementById('feat-importance-img');
                const predImg = document.getElementById('actual-predicted-img');
                if (featImg) featImg.src = `/static/feature_importance.png?t=${Date.now()}`;
                if (predImg) predImg.src = `/static/actual_vs_predicted.png?t=${Date.now()}`;
                fetchPrediction();
            } else {
                alert(`Retrain failed: ${data.message}`);
            }
        } catch (err) {
            alert(`Error during retrain: ${err.message}`);
        } finally {
            retrainBtn.classList.remove('loading');
            retrainBtnText.textContent = 'Retrain Models';
        }
    });

    // ----------------------------------------------------
    // Theme Toggle (Dark / Light)
    // ----------------------------------------------------
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        // Redraw canvas with updated theme contrast
        fetchPrediction();
    });

    // Window resize chart re-render
    window.addEventListener('resize', () => {
        fetchPrediction();
    });

    // Initial Execution
    loadMetadata();
    fetchPrediction();
});
