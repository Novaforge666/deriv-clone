(function () {
    function ensureBotStyles() {
        if (document.getElementById('bot-inline-style')) return;

        var style = document.createElement('style');
        style.id = 'bot-inline-style';
        style.textContent = `
            #pgBot {
                height: 100%;
                min-height: 0;
            }

            #pgBot.active {
                display: block;
            }

            .botbuilder-shell {
                height: 100%;
                min-height: 520px;
                display: flex;
                flex-direction: column;
                background: #101112;
                color: #fff;
            }

            .botbuilder-top {
                height: 44px;
                border-bottom: 1px solid #2a2d2d;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 12px;
                background: #17191a;
                flex-shrink: 0;
            }

            .botbuilder-subnav {
                display: flex;
                gap: 8px;
            }

            .bbs-tab {
                height: 32px;
                padding: 0 12px;
                border: 0;
                background: transparent;
                color: #c2c7c7;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
            }

            .bbs-tab.active {
                background: #232628;
                color: #fff;
            }

            .bbs-runbar {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .bbs-run {
                height: 32px;
                padding: 0 14px;
                border: 0;
                border-radius: 6px;
                background: #18bca0;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
            }

            .bbs-status {
                min-width: 180px;
            }

            .bbs-status-label {
                display: block;
                font-size: 10px;
                color: #6e7575;
                margin-bottom: 4px;
            }

            .bbs-status-track {
                height: 4px;
                background: #2a2d2d;
                border-radius: 999px;
                overflow: hidden;
            }

            .bbs-status-fill {
                width: 0%;
                height: 100%;
                background: #18bca0;
                transition: width .2s ease;
            }

            .botbuilder-body {
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: 190px minmax(0, 1fr) 280px;
            }

            .bbs-left {
                border-right: 1px solid #2a2d2d;
                padding: 12px;
                background: #0f1011;
            }

            .bbs-quick {
                width: 100%;
                height: 30px;
                border: 0;
                border-radius: 4px;
                background: #ff444f;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                font-family: inherit;
                margin-bottom: 12px;
            }

            .bbs-menu-box {
                border: 1px solid #2a2d2d;
                background: #121416;
            }

            .bbs-menu-head {
                height: 38px;
                padding: 0 12px;
                border-bottom: 1px solid #2a2d2d;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
                font-weight: 700;
            }

            .bbs-search {
                height: 40px;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px;
                border-bottom: 1px solid #2a2d2d;
                color: #6e7575;
            }

            .bbs-search input {
                flex: 1;
                border: 0;
                outline: 0;
                background: transparent;
                color: #fff;
                font-family: inherit;
                font-size: 12px;
            }

            .bbs-menu-list {
                display: flex;
                flex-direction: column;
            }

            .bbs-menu-item {
                border: 0;
                border-top: 1px solid #2a2d2d;
                background: transparent;
                color: #c2c7c7;
                text-align: left;
                padding: 10px 12px;
                font-family: inherit;
                font-size: 12px;
            }

            .bbs-menu-item.active,
            .bbs-menu-item:hover {
                background: #1a1d1f;
                color: #fff;
            }

            .bbs-center {
                min-width: 0;
                display: flex;
                flex-direction: column;
                background: #0e0f10;
            }

            .bbs-toolbar {
                height: 40px;
                border-bottom: 1px solid #2a2d2d;
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0 10px;
                background: #131516;
                flex-shrink: 0;
            }

            .bbs-tool {
                width: 28px;
                height: 28px;
                border: 1px solid #2a2d2d;
                background: #17191b;
                color: #c2c7c7;
                border-radius: 4px;
            }

            .bbs-workspace {
                flex: 1;
                min-height: 520px;
                overflow: auto;
                padding: 18px;
                position: relative;
            }

            .bbs-block {
                background: #0f5d86;
                border-radius: 4px;
                padding: 10px;
                color: #fff;
                width: 320px;
                margin-bottom: 14px;
            }

            .bbs-block.small {
                width: 260px;
            }

            .bbs-block.right {
                margin-left: 380px;
            }

            .bbs-block.wide {
                width: 520px;
            }

            .bbs-block-title {
                font-size: 12px;
                font-weight: 700;
                margin-bottom: 10px;
            }

            .bbs-row-grid {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }

            .bbs-inline,
            .bbs-inline-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .bbs-block select,
            .bbs-block input {
                height: 26px;
                border: 0;
                border-radius: 999px;
                background: #fff;
                color: #111;
                padding: 0 10px;
                font-size: 12px;
                font-family: inherit;
            }

            .bbs-right {
                border-left: 1px solid #2a2d2d;
                background: #141617;
                display: flex;
                flex-direction: column;
            }

            .bbs-right-tabs {
                height: 44px;
                border-bottom: 1px solid #2a2d2d;
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 0 14px;
                flex-shrink: 0;
            }

            .bbs-rtab {
                border: 0;
                background: transparent;
                color: #c2c7c7;
                font-size: 12px;
                font-family: inherit;
            }

            .bbs-rtab.active {
                color: #fff;
                border-bottom: 2px solid #ff444f;
                padding-bottom: 8px;
            }

            .bbs-summary-box {
                flex: 1;
                padding: 14px;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .bbs-summary-empty {
                flex: 1;
                min-height: 240px;
                border: 1px solid #2a2d2d;
                background: #111214;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #c2c7c7;
                font-size: 13px;
                line-height: 1.6;
                padding: 16px;
            }

            .bbs-metrics {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 12px;
                margin-bottom: 12px;
            }

            .bbs-metrics span {
                display: block;
                font-size: 10px;
                color: #6e7575;
                margin-bottom: 4px;
            }

            .bbs-metrics strong {
                font-size: 12px;
                color: #fff;
            }

            .bbs-reset {
                height: 34px;
                border: 1px solid #2a2d2d;
                background: transparent;
                color: #fff;
                border-radius: 4px;
                font-family: inherit;
                cursor: pointer;
            }

            @media (max-width: 1100px) {
                .botbuilder-body {
                    grid-template-columns: 180px minmax(0, 1fr);
                }

                .bbs-right {
                    display: none;
                }
            }

            @media (max-width: 700px) {
                .botbuilder-top {
                    height: auto;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                    padding: 10px;
                }

                .botbuilder-body {
                    grid-template-columns: 1fr;
                }

                .bbs-left {
                    display: none;
                }

                .bbs-block,
                .bbs-block.small,
                .bbs-block.wide {
                    width: 100%;
                    margin-left: 0;
                }

                .bbs-block.right {
                    margin-left: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function bindBotUI() {
        ensureBotStyles();

        var runBtn = document.getElementById('bbsRunBtn');
        var resetBtn = document.getElementById('bbsResetBtn');

        if (runBtn && !runBtn.dataset.bound) {
            runBtn.dataset.bound = '1';
            runBtn.addEventListener('click', function () {
                var fill = document.getElementById('bbsStatusFill');
                var runs = document.getElementById('bbsRuns');
                var txt = document.getElementById('bbsSummaryText');

                if (fill) fill.style.width = '100%';
                if (runs) runs.textContent = String((+runs.textContent || 0) + 1);
                if (txt) txt.innerHTML = 'Bot builder shell is active.<br>Logic layer is the next step.';
            });
        }

        if (resetBtn && !resetBtn.dataset.bound) {
            resetBtn.dataset.bound = '1';
            resetBtn.addEventListener('click', function () {
                var fill = document.getElementById('bbsStatusFill');
                var runs = document.getElementById('bbsRuns');
                var txt = document.getElementById('bbsSummaryText');

                if (fill) fill.style.width = '0%';
                if (runs) runs.textContent = '0';
                if (txt) txt.innerHTML = 'Bot builder shell ready.<br>Next step is wiring the block logic.';
            });
        }
    }

    window.botInit = function () {
        bindBotUI();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindBotUI);
    } else {
        bindBotUI();
    }
})();