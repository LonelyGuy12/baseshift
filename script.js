document.addEventListener('DOMContentLoaded', () => {
    const fromBaseInput = document.getElementById('from-base');
    const toBaseInput = document.getElementById('to-base');
    const numberInput = document.getElementById('number-input');
    const resultDisplay = document.getElementById('result-display');
    const errorMessage = document.getElementById('error-message');
    const swapBtn = document.getElementById('swap-btn');
    const presets = document.querySelectorAll('.chip');
    
    const toggleStepsBtn = document.getElementById('toggle-steps');
    const stepsContent = document.getElementById('steps-content');
    
    let debounceTimer;

    // Characters map
    const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";


    function getDigitValue(char) {
        return CHARS.indexOf(char.toUpperCase());
    }

    function isValidNumber(numStr, base) {
        if (!numStr) return { valid: true };
        
        let start = 0;
        if (numStr[0] === '-') start = 1;
        if (start === 1 && numStr.length === 1) return { valid: true }; // Just '-'

        for (let i = start; i < numStr.length; i++) {
            const val = getDigitValue(numStr[i]);
            if (val === -1 || val >= base) {
                return { valid: false, char: numStr[i] };
            }
        }
        return { valid: true };
    }

    function processConversion() {
        const numStr = numberInput.value.trim();
        const fromBase = parseInt(fromBaseInput.value, 10);
        const toBase = parseInt(toBaseInput.value, 10);
        
        errorMessage.classList.remove('visible');
        errorMessage.textContent = '';
        numberInput.classList.remove('invalid');

        if (isNaN(fromBase) || fromBase < 2 || fromBase > 36 || isNaN(toBase) || toBase < 2 || toBase > 36) {
            errorMessage.textContent = 'Bases must be between 2 and 36';
            errorMessage.classList.add('visible');
            resultDisplay.textContent = 'Error';
            resultDisplay.style.opacity = '0.5';
            clearSteps();
            return;
        }

        if (!numStr || numStr === '-') {
            resultDisplay.textContent = '0';
            resultDisplay.style.opacity = '0.5';
            clearSteps();
            return;
        }

        const validation = isValidNumber(numStr, fromBase);
        if (!validation.valid) {
            numberInput.classList.add('invalid');
            errorMessage.textContent = `Invalid character '${validation.char}' for base ${fromBase}`;
            errorMessage.classList.add('visible');
            resultDisplay.textContent = 'Error';
            resultDisplay.style.opacity = '0.5';
            clearSteps();
            return;
        }

        resultDisplay.style.opacity = '1';

        try {
            const result = convertBase(numStr, fromBase, toBase);
            resultDisplay.textContent = result.toStr;
            generateSteps(result, fromBase, toBase, numStr);
        } catch (e) {
            console.error(e);
            resultDisplay.textContent = 'Error computing result';
            resultDisplay.style.opacity = '0.5';
        }
    }

    function convertBase(numStr, fromBase, toBase) {
        let isNegative = false;
        let cleanStr = numStr;
        
        if (numStr[0] === '-') {
            isNegative = true;
            cleanStr = numStr.slice(1);
        }
        
        // Remove leading zeros
        while (cleanStr.length > 1 && cleanStr[0] === '0') {
            cleanStr = cleanStr.slice(1);
        }

        const bigFromBase = BigInt(fromBase);
        let decimalValue = BigInt(0);
        let fromSteps = [];

        // 1. Convert to Decimal
        for (let i = 0; i < cleanStr.length; i++) {
            const digitChar = cleanStr[cleanStr.length - 1 - i];
            const digitVal = BigInt(getDigitValue(digitChar));
            const powerVal = bigFromBase ** BigInt(i);
            const positionalVal = digitVal * powerVal;
            decimalValue += positionalVal;
            
            fromSteps.push({
                digit: digitChar,
                val: digitVal,
                pos: i,
                power: powerVal,
                result: positionalVal
            });
        }
        fromSteps.reverse(); // highest position first

        // 2. Convert from Decimal to ToBase
        let toSteps = [];
        let toStr = "";
        
        if (decimalValue === BigInt(0)) {
            toStr = "0";
            toSteps.push({ quotient: 0n, remainder: 0n, char: '0' });
        } else {
            let tempValue = decimalValue;
            const bigToBase = BigInt(toBase);
            
            while (tempValue > BigInt(0)) {
                const quotient = tempValue / bigToBase;
                const remainder = tempValue % bigToBase;
                const char = CHARS[Number(remainder)];
                
                toSteps.push({
                    quotient: quotient,
                    remainder: remainder,
                    char: char
                });
                
                toStr = char + toStr;
                tempValue = quotient;
            }
        }

        if (isNegative && toStr !== "0") {
            toStr = "-" + toStr;
        }

        return {
            decimalValue,
            fromSteps,
            toSteps,
            toStr,
            isNegative
        };
    }

    function generateSteps(result, fromBase, toBase, originalStr) {
        const stepsContainer = document.getElementById('steps-content');
        
        let html = '<div class="steps-inner">';

        // 1. To Decimal Step (skip if fromBase is 10)
        if (fromBase !== 10) {
            html += `<div class="step-group">
                <div class="step-title">1. Convert from Base ${fromBase} to Decimal (Base 10)</div>
                <div class="step-math">`;
            
            let sumParts = [];
            result.fromSteps.forEach(step => {
                html += `<div class="step-item">
                    ${step.digit} × (${fromBase}<sup>${step.pos}</sup>) 
                    = ${step.val} × ${step.power} 
                    = <strong>${step.result}</strong>
                </div>`;
                sumParts.push(step.result);
            });
            
            html += `<div class="step-item" style="margin-top: 0.5rem; border-left-color: var(--accent);">
                <strong>Sum:</strong> ${sumParts.join(' + ')} = <strong>${result.decimalValue}</strong>
            </div>`;
            
            html += `</div></div>`;
        }

        // 2. Decimal to Target Step (skip if toBase is 10)
        if (toBase !== 10) {
            let stepNum = fromBase !== 10 ? '2' : '1';
            html += `<div class="step-group">
                <div class="step-title">${stepNum}. Convert Decimal ${result.decimalValue} to Base ${toBase}</div>
                <table class="step-table">
                    <thead>
                        <tr>
                            <th>Division</th>
                            <th>Quotient</th>
                            <th>Remainder</th>
                            <th>Digit</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            let currentVal = result.decimalValue;
            if (currentVal === 0n) {
                html += `<tr>
                    <td>0 ÷ ${toBase}</td>
                    <td>0</td>
                    <td>0</td>
                    <td><strong>0</strong></td>
                </tr>`;
            } else {
                result.toSteps.forEach(step => {
                    html += `<tr>
                        <td>${currentVal} ÷ ${toBase}</td>
                        <td>${step.quotient}</td>
                        <td>${step.remainder}</td>
                        <td><strong>${step.char}</strong></td>
                    </tr>`;
                    currentVal = step.quotient;
                });
            }
            
            html += `</tbody></table>
                <div class="step-item" style="margin-top: 1rem; border-left-color: var(--accent);">
                    Read digits from bottom to top: <strong>${result.isNegative ? '-' : ''}${result.toSteps.map(s => s.char).reverse().join('')}</strong>
                </div>
            </div>`;
        }

        if (fromBase === 10 && toBase === 10) {
             html += `<div class="step-group">
                <div class="step-title">No conversion needed (Base 10 to Base 10)</div>
                <div class="step-item">Result is identical to the input.</div>
            </div>`;
        }

        html += '</div>';
        stepsContainer.innerHTML = html;
        
        // Update height smoothly if already open
        if (toggleStepsBtn.classList.contains('active')) {
            stepsContent.style.maxHeight = stepsContent.scrollHeight + "px";
        }
    }

    function clearSteps() {
        document.getElementById('steps-content').innerHTML = '';
        if (toggleStepsBtn.classList.contains('active')) {
            stepsContent.style.maxHeight = '0px';
        }
    }

    // Debounce the input for smoother UX
    numberInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processConversion, 150);
    });

    fromBaseInput.addEventListener('input', () => {
        processConversion();
    });

    toBaseInput.addEventListener('input', () => {
        processConversion();
    });

    swapBtn.addEventListener('click', () => {
        const temp = fromBaseInput.value;
        fromBaseInput.value = toBaseInput.value;
        toBaseInput.value = temp;
        processConversion();
    });

    presets.forEach(preset => {
        preset.addEventListener('click', () => {
            fromBaseInput.value = preset.dataset.from;
            toBaseInput.value = preset.dataset.to;
            processConversion();
        });
    });

    toggleStepsBtn.addEventListener('click', () => {
        toggleStepsBtn.classList.toggle('active');
        if (toggleStepsBtn.classList.contains('active')) {
            stepsContent.style.maxHeight = stepsContent.scrollHeight + "px";
        } else {
            stepsContent.style.maxHeight = "0px";
        }
    });

    // Run once on load to initialize state
    processConversion();
});
