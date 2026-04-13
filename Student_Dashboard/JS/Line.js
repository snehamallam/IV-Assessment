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

const referenceLineGroup = chartGroup.append("g");
const lineGroup = chartGroup.append("g");
const pointsGroup = chartGroup.append("g");
const labelsGroup = chartGroup.append("g");

chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Sleep Hours");

chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Average Exam Score");

const tooltip = d3.select("body")
    .append("div")
    .attr("id", "lineTooltip")
    .style("position", "absolute")
    .style("background", "rgba(33, 33, 33, 0.95)")
    .style("color", "white")
    .style("padding", "8px 10px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("line-height", "1.4")
    .style("pointer-events", "none")
    .style("opacity", 0);

let fullData = [];
let selectedSleepHour = null;
let currentFilter = "All";

d3.csv("IV_Dataset.csv").then(function(data) {
    data.forEach(function(d) {
        d.Sleep_Hours = +d.Sleep_Hours;
        d.Exam_Score = +d.Exam_Score;
        d.Tutoring_Sessions = +d.Tutoring_Sessions;
    });

    fullData = data;

    updateChart("All");
    updateInsightText("All", null);

    d3.select("#tutoringFilter").on("change", function() {
        currentFilter = this.value;
        selectedSleepHour = null;
        updateChart(currentFilter);
        updateInsightText(currentFilter, null);
    });
});

function getFilteredData(filterValue) {
    if (filterValue === "All") return fullData;

    return fullData.filter(function(d) {
        const sessions = d.Tutoring_Sessions;
        if (filterValue === "Low") return sessions >= 0 && sessions <= 2;
        if (filterValue === "Medium") return sessions >= 3 && sessions <= 5;
        if (filterValue === "High") return sessions >= 6;
        return true;
    });
}

function buildAvgData(filteredData) {
    return d3.rollups(
        filteredData,
        v => ({
            avgScore: d3.mean(v, d => d.Exam_Score),
            count: v.length
        }),
        d => d.Sleep_Hours
    )
    .map(([sleepHour, values]) => ({
        sleepHour: +sleepHour,
        avgScore: values.avgScore,
        count: values.count
    }))
    .sort((a, b) => a.sleepHour - b.sleepHour);
}

function getFilterLabel(filterValue) {
    if (filterValue === "Low") return "Low tutoring (0–2)";
    if (filterValue === "Medium") return "Medium tutoring (3–5)";
    if (filterValue === "High") return "High tutoring (6+)";
    return "All students";
}

function updateChart(filterValue) {
    const filteredData = getFilteredData(filterValue);
    const avgData = buildAvgData(filteredData);
    const overallAverage = d3.mean(filteredData, d => d.Exam_Score);

    const x = d3.scaleLinear()
        .domain(d3.extent(avgData, d => d.sleepHour))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(avgData, d => d.avgScore) - 1.5,
            d3.max(avgData, d => d.avgScore) + 1.5
        ])
        .nice()
        .range([height, 0]);

    xAxisGroup
        .transition()
        .duration(800)
        .call(d3.axisBottom(x).ticks(avgData.length).tickFormat(d3.format(".1f")));

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

    const line = d3.line()
        .x(d => x(d.sleepHour))
        .y(d => y(d.avgScore));

    const path = lineGroup.selectAll(".sleep-line")
        .data([avgData]);

    path.enter()
        .append("path")
        .attr("class", "sleep-line")
        .attr("fill", "none")
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 3)
        .merge(path)
        .transition()
        .duration(900)
        .attr("d", line);

    const points = pointsGroup.selectAll(".point")
        .data(avgData, d => d.sleepHour);

    points.enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", d => x(d.sleepHour))
        .attr("cy", d => y(d.avgScore))
        .attr("r", 0)
        .attr("fill", "#2e7d32")
        .attr("stroke", "none")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 8)
                .attr("stroke", "#163d19")
                .attr("stroke-width", 2);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Sleep Hours:</strong> ${d.sleepHour}<br>
                    <strong>Average Score:</strong> ${d.avgScore.toFixed(1)}<br>
                    <strong>Students:</strong> ${d.count}<br>
                    <strong>Group:</strong> ${getFilterLabel(filterValue)}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", selectedSleepHour === d.sleepHour ? 8 : 6)
                .attr("stroke", selectedSleepHour === d.sleepHour ? "#163d19" : "none")
                .attr("stroke-width", selectedSleepHour === d.sleepHour ? 2 : 0);

            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (selectedSleepHour === d.sleepHour) {
                selectedSleepHour = null;
            } else {
                selectedSleepHour = d.sleepHour;
            }

            pointsGroup.selectAll(".point")
                .transition()
                .duration(250)
                .attr("opacity", point =>
                    selectedSleepHour === null || point.sleepHour === selectedSleepHour ? 1 : 0.35
                )
                .attr("r", point =>
                    selectedSleepHour === null ? 6 : (point.sleepHour === selectedSleepHour ? 8 : 5)
                )
                .attr("stroke", point =>
                    selectedSleepHour !== null && point.sleepHour === selectedSleepHour ? "#163d19" : "none"
                )
                .attr("stroke-width", point =>
                    selectedSleepHour !== null && point.sleepHour === selectedSleepHour ? 2 : 0
                );

            labelsGroup.selectAll(".label")
                .transition()
                .duration(250)
                .attr("opacity", label =>
                    selectedSleepHour === null || label.sleepHour === selectedSleepHour ? 1 : 0.35
                );

            lineGroup.selectAll(".sleep-line")
                .transition()
                .duration(250)
                .attr("opacity", selectedSleepHour === null ? 1 : 0.55);

            updateInsightText(filterValue, selectedSleepHour);
        })
        .merge(points)
        .transition()
        .duration(900)
        .attr("cx", d => x(d.sleepHour))
        .attr("cy", d => y(d.avgScore))
        .attr("r", d => selectedSleepHour === null ? 6 : (d.sleepHour === selectedSleepHour ? 8 : 5))
        .attr("opacity", d => selectedSleepHour === null || d.sleepHour === selectedSleepHour ? 1 : 0.35)
        .attr("fill", "#2e7d32")
        .attr("stroke", d => selectedSleepHour !== null && d.sleepHour === selectedSleepHour ? "#163d19" : "none")
        .attr("stroke-width", d => selectedSleepHour !== null && d.sleepHour === selectedSleepHour ? 2 : 0);

    points.exit().remove();

    const labels = labelsGroup.selectAll(".label")
        .data(avgData, d => d.sleepHour);

    labels.enter()
        .append("text")
        .attr("class", "label")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#1b5e20")
        .merge(labels)
        .transition()
        .duration(900)
        .attr("x", function(d) {
            return d.sleepHour === avgData[0].sleepHour ? x(d.sleepHour) + 14 : x(d.sleepHour);
        })
        .attr("y", d => y(d.avgScore) - 15)
        .attr("text-anchor", function(d) {
            return d.sleepHour === avgData[0].sleepHour ? "start" : "middle";
        })
        .text(d => d.avgScore.toFixed(1))
        .attr("opacity", d => selectedSleepHour === null || d.sleepHour === selectedSleepHour ? 1 : 0.35);

    labels.exit().remove();
}

function updateInsightText(filterValue, focusedSleepHour) {
    const insight = document.getElementById("chartInsight");
    const filteredData = getFilteredData(filterValue);
    const avgData = buildAvgData(filteredData);

    let text = "";

    if (focusedSleepHour !== null) {
        const selectedPoint = avgData.find(d => d.sleepHour === focusedSleepHour);

        text = `For <strong>${getFilterLabel(filterValue)}</strong>, students sleeping <strong>${selectedPoint.sleepHour} hours</strong> have an average exam score of <strong>${selectedPoint.avgScore.toFixed(1)}</strong> based on <strong>${selectedPoint.count}</strong> students. This supports the view that score differences across sleep durations are present, but relatively small overall.`;
    } else {
        const highestPoint = avgData.reduce((a, b) => a.avgScore > b.avgScore ? a : b);
        const lowestPoint = avgData.reduce((a, b) => a.avgScore < b.avgScore ? a : b);
        const difference = (highestPoint.avgScore - lowestPoint.avgScore).toFixed(1);

        text = `For <strong>${getFilterLabel(filterValue)}</strong>, average exam scores range from <strong>${lowestPoint.avgScore.toFixed(1)}</strong> at <strong>${lowestPoint.sleepHour} hours</strong> of sleep to <strong>${highestPoint.avgScore.toFixed(1)}</strong> at <strong>${highestPoint.sleepHour} hours</strong>. The overall variation is only <strong>${difference}</strong> points, suggesting that sleep hours alone may have a weaker direct effect on exam performance than other factors.`;
    }

    insight.innerHTML = `
        <div class="insight-box">
            <div class="insight-title">Key Insight</div>
            <p class="insight-text">${text}</p>
        </div>
    `;
}