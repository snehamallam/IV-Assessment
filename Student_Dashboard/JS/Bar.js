const margin = { top: 30, right: 40, bottom: 60, left: 70 },
      width = 750 - margin.left - margin.right,
      height = 320 - margin.top - margin.bottom;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "block")
    .style("margin", "0 auto");

const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const xAxisGroup = chartGroup.append("g")
    .attr("transform", `translate(0,${height})`);

const yAxisGroup = chartGroup.append("g");

const barsGroup = chartGroup.append("g");
const labelsGroup = chartGroup.append("g");
const referenceLineGroup = chartGroup.append("g");

chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Attendance Range (%)");

chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Average Exam Score");

const tooltip = d3.select("body")
    .append("div")
    .attr("id", "barTooltip")
    .style("position", "absolute")
    .style("background", "rgba(33, 33, 33, 0.95)")
    .style("color", "white")
    .style("padding", "8px 10px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("line-height", "1.4")
    .style("pointer-events", "none")
    .style("opacity", 0);

let selectedRange = null;
let fullData = [];

d3.csv("IV_Dataset.csv").then(function(data) {
    data.forEach(function(d) {
        d.Attendance = +d.Attendance;
        d.Exam_Score = +d.Exam_Score;
    });

    fullData = data;

    updateChart("All");
    updateInsightText("All", null);

    d3.select("#genderFilter").on("change", function() {
        selectedRange = null;
        updateChart(this.value);
        updateInsightText(this.value, null);
    });
});

function getAttendanceRange(attendance) {
    if (attendance < 70) return "60-69";
    if (attendance < 80) return "70-79";
    if (attendance < 90) return "80-89";
    return "90-100";
}

function getBarColor(filterValue) {
    if (filterValue === "Male") return "#2e7d32";
    if (filterValue === "Female") return "#66bb6a";
    return "#4CAF50";
}

function getFilteredData(filterValue) {
    if (filterValue === "All") return fullData;
    return fullData.filter(d => d.Gender === filterValue);
}

function buildAvgData(filteredData) {
    const rolled = d3.rollups(
        filteredData,
        v => ({
            avgScore: d3.mean(v, d => d.Exam_Score),
            count: v.length
        }),
        d => getAttendanceRange(d.Attendance)
    );

    const order = ["60-69", "70-79", "80-89", "90-100"];

    return rolled
        .map(([range, values]) => ({
            range: range,
            avgScore: values.avgScore,
            count: values.count
        }))
        .sort((a, b) => order.indexOf(a.range) - order.indexOf(b.range));
}

function updateChart(filterValue) {
    const filteredData = getFilteredData(filterValue);
    const avgData = buildAvgData(filteredData);
    const overallAverage = d3.mean(filteredData, d => d.Exam_Score);
    const barColor = getBarColor(filterValue);

    const x = d3.scaleBand()
        .domain(avgData.map(d => d.range))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, Math.max(80, d3.max(avgData, d => d.avgScore) + 5)])
        .nice()
        .range([height, 0]);

    xAxisGroup
        .transition()
        .duration(800)
        .call(d3.axisBottom(x));

    xAxisGroup.selectAll("text")
        .style("font-size", "13px");

    yAxisGroup
        .transition()
        .duration(800)
        .call(d3.axisLeft(y));

    yAxisGroup.selectAll("text")
        .style("font-size", "13px");

    referenceLineGroup.selectAll("*").remove();

    referenceLineGroup.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(overallAverage))
        .attr("y2", y(overallAverage))
        .attr("stroke", "#666")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5");

    referenceLineGroup.append("text")
        .attr("x", width - 5)
        .attr("y", y(overallAverage) - 8)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", "#555")
        .text(`Overall Avg: ${overallAverage.toFixed(1)}`);

    const bars = barsGroup.selectAll(".bar")
        .data(avgData, d => d.range);

    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.range))
        .attr("width", x.bandwidth())
        .attr("y", height)
        .attr("height", 0)
        .attr("fill", barColor)
        .attr("opacity", d => selectedRange && d.range !== selectedRange ? 0.35 : 1)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("stroke", "#1b1b1b")
                .attr("stroke-width", 2)
                .attr("opacity", 0.85);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Attendance:</strong> ${d.range}%<br>
                    <strong>Average Score:</strong> ${d.avgScore.toFixed(1)}<br>
                    <strong>Students:</strong> ${d.count}<br>
                    <strong>Gender:</strong> ${filterValue}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .attr("stroke", "none")
                .attr("opacity", selectedRange && d.range !== selectedRange ? 0.35 : 1);

            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (selectedRange === d.range) {
                selectedRange = null;
            } else {
                selectedRange = d.range;
            }

            barsGroup.selectAll(".bar")
                .transition()
                .duration(300)
                .attr("opacity", bar =>
                    selectedRange === null || bar.range === selectedRange ? 1 : 0.35
                );

            labelsGroup.selectAll(".label")
                .transition()
                .duration(300)
                .attr("opacity", label =>
                    selectedRange === null || label.range === selectedRange ? 1 : 0.35
                );

            updateInsightText(filterValue, selectedRange);
        })
        .merge(bars)
        .transition()
        .duration(900)
        .attr("x", d => x(d.range))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.avgScore))
        .attr("height", d => height - y(d.avgScore))
        .attr("fill", barColor)
        .attr("opacity", d => selectedRange && d.range !== selectedRange ? 0.35 : 1);

    bars.exit()
        .transition()
        .duration(500)
        .attr("y", height)
        .attr("height", 0)
        .remove();

    const labels = labelsGroup.selectAll(".label")
        .data(avgData, d => d.range);

    labels.enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.range) + x.bandwidth() / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .merge(labels)
        .transition()
        .duration(900)
        .attr("x", d => x(d.range) + x.bandwidth() / 2)
        .attr("y", d => y(d.avgScore) - 6)
        .text(d => d.avgScore.toFixed(1))
        .attr("opacity", d => selectedRange && d.range !== selectedRange ? 0.35 : 1);

    labels.exit().remove();
}

function updateInsightText(filterValue, focusedRange) {
    const insight = document.getElementById("chartInsight");
    const filteredData = getFilteredData(filterValue);
    const avgData = buildAvgData(filteredData);

    let text = "";

    if (focusedRange) {
        const selectedBar = avgData.find(d => d.range === focusedRange);
        const lowestBar = avgData.reduce((a, b) => a.avgScore < b.avgScore ? a : b);

        text = `For ${filterValue} students, the attendance range <strong>${focusedRange}%</strong> has an average exam score of <strong>${selectedBar.avgScore.toFixed(1)}</strong> based on <strong>${selectedBar.count}</strong> students. Compared with the lowest attendance group, this helps show how stronger attendance is associated with better performance.`;
    } else {
        const highestBar = avgData.reduce((a, b) => a.avgScore > b.avgScore ? a : b);
        const lowestBar = avgData.reduce((a, b) => a.avgScore < b.avgScore ? a : b);
        const difference = (highestBar.avgScore - lowestBar.avgScore).toFixed(1);

        if (filterValue === "Male") {
            text = `Among <strong>male students</strong>, the highest average exam score appears in the <strong>${highestBar.range}%</strong> attendance group at <strong>${highestBar.avgScore.toFixed(1)}</strong>. The gap between the highest and lowest attendance groups is <strong>${difference}</strong> points, suggesting that attendance has a meaningful relationship with academic performance.`;
        } else if (filterValue === "Female") {
            text = `Among <strong>female students</strong>, the highest average exam score appears in the <strong>${highestBar.range}%</strong> attendance group at <strong>${highestBar.avgScore.toFixed(1)}</strong>. The difference between the highest and lowest attendance groups is <strong>${difference}</strong> points, reinforcing the positive link between better attendance and stronger performance.`;
        } else {
            text = `Across <strong>all students</strong>, average exam scores rise from <strong>${lowestBar.avgScore.toFixed(1)}</strong> in the <strong>${lowestBar.range}%</strong> attendance group to <strong>${highestBar.avgScore.toFixed(1)}</strong> in the <strong>${highestBar.range}%</strong> group. This <strong>${difference}</strong>-point increase suggests that regular attendance is strongly associated with better academic outcomes.`;
        }
    }

    insight.innerHTML = `
        <div class="insight-box">
            <div class="insight-title">Key Insight</div>
            <p class="insight-text">${text}</p>
        </div>
    `;
}