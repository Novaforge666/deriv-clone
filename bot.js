document.addEventListener('DOMContentLoaded', function () {
    bindBotUI();
});

function botInit() {
    bindBotUI();
}

function bindBotUI() {
    if (document.body.dataset.botBound === '1') return;
    document.body.dataset.botBound = '1';

    document.addEventListener('click', function (e) {
        if (e.target.closest('#bbsRunBtn')) {
            var fill = document.getElementById('bbsStatusFill');
            var runs = document.getElementById('bbsRuns');
            var txt = document.getElementById('bbsSummaryText');

            if (fill) fill.style.width = '100%';
            if (runs) runs.textContent = String((+runs.textContent || 0) + 1);
            if (txt) {
                txt.innerHTML = 'Bot builder shell is active.<br>Logic layer is the next step.';
            }
        }

        if (e.target.closest('#bbsResetBtn')) {
            var fill2 = document.getElementById('bbsStatusFill');
            var runs2 = document.getElementById('bbsRuns');
            var txt2 = document.getElementById('bbsSummaryText');

            if (fill2) fill2.style.width = '0%';
            if (runs2) runs2.textContent = '0';
            if (txt2) {
                txt2.innerHTML = 'Bot builder shell ready.<br>Next step is wiring the block logic.';
            }
        }
    });
}