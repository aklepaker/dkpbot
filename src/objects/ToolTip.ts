export default function ToolTip(html: string): string {
    const body = `
<html>
<head>
</head>
<body style="margin: 0px; margin-left: 45px;" onLoad="reset();">
    <script>var whTooltips = { colorLinks: false, iconizeLinks: false, renameLinks: false };</script>
    <script src="https://wow.zamimg.com/widgets/power.js"></script>
    <script>

        function reset() {
            console.log(WH.Tooltip.setTooltipVisibility);
            WH.Tooltip.hide = function (e) {
                const tooltip = document.querySelectorAll(".wowhead-tooltip");
                console.log(tooltip);
                console.log(tooltip[0].getBoundingClientRect());
            }

            // WH.Tooltip.setTooltipVisibility(tooltipref, false)
            WH.Tooltip.move(30, -10, 0, 0, 15, 15)
            const tooltip = document.querySelectorAll(".wowhead-tooltip");
            tooltip[0].getBoundingClientRect();
            const size = document.querySelector("#size");
            size.style.height = tooltip[0].getBoundingClientRect().height + 15;
            size.style.width = tooltip[0].getBoundingClientRect().width ;
        }


    </script>
    <div id="size">
        <a id="tooltipref" href="#" data-wowhead="domain=classic&item=${html}" onClick="reset()"
            style="color: rgba(0,0,0,0.0)">&nbsp;</a>
    </div>
</body>
</html>
`
    return body;
}

