function botInit() {
    var page = document.getElementById('pgBot');
    if (!page) return;

    var fill = document.getElementById('bbsStatusFill');
    var runs = document.getElementById('bbsRuns');
    var txt = document.getElementById('bbsSummaryText');
    var runBtn = document.getElementById('bbsRunBtn');
    var resetBtn = document.getElementById('bbsResetBtn');

    if (runBtn && !runBtn.dataset.bound) {
        runBtn.dataset.bound = '1';
        runBtn.addEventListener('click', function () {
            if (fill) fill.style.width = '100%';
            if (runs) runs.textContent = String((+runs.textContent || 0) + 1);
            if (txt) txt.innerHTML = 'Bot builder shell is active.<br>Logic layer is the next step.';
        });
    }

    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.addEventListener('click', function () {
            if (fill) fill.style.width = '0%';
            if (runs) runs.textContent = '0';
            if (txt) txt.innerHTML = 'Bot builder shell ready.<br>Next step is wiring the block logic.';
        });
    }
}