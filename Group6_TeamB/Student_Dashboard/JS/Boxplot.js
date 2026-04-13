const margin = { top: 40, right: 40, bottom: 80, left: 80 },
      width = 850 - margin.left - margin.right,
      height = 380 - margin.top - margin.bottom;

// Tooltip
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(33, 33, 33, 0.95)")
    .style("color", "white")
    .style("padding", "8px 10px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("line-height", "1.4")
    .style("pointer-events", "none")
    .style("opacity", 0);

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

const referenceGroup = chartGroup.append("g");
const whiskerGroup = chartGroup.append("g");
const boxGroup = chartGroup.append("g");
const pointGroup = chartGroup.append("g");
const labelGroup = chartGroup.append("g");

// Axis labels
chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + 60)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Extracurricular Activities");

chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Exam Score");

let fullData = [];
let selectedCategory = null;
let currentFilter = "All";

// Load CSV
d3.csv("IV_Dataset.csv").then(function(data) {
    data.forEach(d => {
        d.Exam_Score = +d.Exam_Score;
    });

    fullData = data;

    updateChart("All");
    updateInsightText("All", null);

    d3.select("#motivationFilter").on("change", function() {
        currentFilter = this.value;
        selectedCategory = null;
        updateChart(currentFilter);
        updateInsightText(currentFilter, null);
    });
});

function getFilteredData(filterValue) {
    if (filterValue === "All") return fullData;
    return fullData.filter(d => d.Motivation_Level === filterValue);
}

function getMotivationLabel(filterValue) {
    return filterValue === "All" ? "All motivation levels" : filterValue;
}

function buildBoxData(filteredData) {
    const grouped = d3.group(filteredData, d => d.Extracurricular_Activities);
    const categories = ["No", "Yes"];

    return categories.map(cat => {
        const values = (grouped.get(cat) || [])
            .map(d => d.Exam_Score)
            .filter(v => !isNaN(v))
            .sort(d3.ascending);

        return {
            category: cat,
            values: values,
            count: values.length,
            min: d3.min(values),
            q1: d3.quantile(values, 0.25),
            median: d3.quantile(values, 0.5),
            q3: d3.quantile(values, 0.75),
            max: d3.max(values),
            avg: d3.mean(values)
        };
    });
}

function updateChart(filterValue) {
    const filteredData = getFilteredData(filterValue);
    const boxData = buildBoxData(filteredData);
    const overallAverage = d3.mean(filteredData, d => d.Exam_Score);

    const x = d3.scaleBand()
        .domain(boxData.map(d => d.category))
        .range([0, width])
        .padding(0.45);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    xAxisGroup
        .transition()
        .duration(800)
        .call(d3.axisBottom(x));

    yAxisGroup
        .transition()
        .duration(800)
        .call(d3.axisLeft(y));

    xAxisGroup.selectAll("text")
        .style("font-size", "14px");

    yAxisGroup.selectAll("text")
        .style("font-size", "14px");

    // Overall average line
    referenceGroup.selectAll("*").remove();

    referenceGroup.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(overallAverage))
        .attr("y2", y(overallAverage))
        .attr("stroke", "#666")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "5,5");

    referenceGroup.append("text")
        .attr("x", width - 5)
        .attr("y", y(overallAverage) - 8)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", "#555")
        .text(`Overall Avg: ${overallAverage.toFixed(1)}`);

    // Whisker vertical lines
    const whiskers = whiskerGroup.selectAll(".whisker-line")
        .data(boxData, d => d.category);

    whiskers.enter()
        .append("line")
        .attr("class", "whisker-line")
        .merge(whiskers)
        .transition()
        .duration(900)
        .attr("x1", d => x(d.category) + x.bandwidth() / 2)
        .attr("x2", d => x(d.category) + x.bandwidth() / 2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 1.5)
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    whiskers.exit().remove();

    // Top whisker caps
    const topCaps = whiskerGroup.selectAll(".top-cap")
        .data(boxData, d => d.category);

    topCaps.enter()
        .append("line")
        .attr("class", "top-cap")
        .merge(topCaps)
        .transition()
        .duration(900)
        .attr("x1", d => x(d.category) + x.bandwidth() / 2 - 18)
        .attr("x2", d => x(d.category) + x.bandwidth() / 2 + 18)
        .attr("y1", d => y(d.max))
        .attr("y2", d => y(d.max))
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 1.5)
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    topCaps.exit().remove();

    // Bottom whisker caps
    const bottomCaps = whiskerGroup.selectAll(".bottom-cap")
        .data(boxData, d => d.category);

    bottomCaps.enter()
        .append("line")
        .attr("class", "bottom-cap")
        .merge(bottomCaps)
        .transition()
        .duration(900)
        .attr("x1", d => x(d.category) + x.bandwidth() / 2 - 18)
        .attr("x2", d => x(d.category) + x.bandwidth() / 2 + 18)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.min))
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 1.5)
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    bottomCaps.exit().remove();

    // Box rectangles
    const boxes = boxGroup.selectAll(".box-rect")
        .data(boxData, d => d.category);

    boxes.enter()
        .append("rect")
        .attr("class", "box-rect")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("fill", "#2e7d32")
                .attr("opacity", 0.9);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Activity:</strong> ${d.category}<br>
                    <strong>Students:</strong> ${d.count}<br>
                    <strong>Average:</strong> ${d.avg.toFixed(1)}<br>
                    <strong>Min:</strong> ${d.min.toFixed(1)}<br>
                    <strong>Q1:</strong> ${d.q1.toFixed(1)}<br>
                    <strong>Median:</strong> ${d.median.toFixed(1)}<br>
                    <strong>Q3:</strong> ${d.q3.toFixed(1)}<br>
                    <strong>Max:</strong> ${d.max.toFixed(1)}<br>
                    <strong>Motivation:</strong> ${getMotivationLabel(filterValue)}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .attr("fill", "#66bb6a")
                .attr("opacity", selectedCategory && d.category !== selectedCategory ? 0.2 : 0.78);

            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (selectedCategory === d.category) {
                selectedCategory = null;
            } else {
                selectedCategory = d.category;
            }
            applyFocusState();
            updateInsightText(filterValue, selectedCategory);
        })
        .merge(boxes)
        .transition()
        .duration(900)
        .attr("x", d => x(d.category))
        .attr("y", d => y(d.q3))
        .attr("height", d => y(d.q1) - y(d.q3))
        .attr("width", x.bandwidth())
        .attr("fill", "#66bb6a")
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 1.5)
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 0.78);

    boxes.exit().remove();

    // Median lines
    const medians = boxGroup.selectAll(".median-line")
        .data(boxData, d => d.category);

    medians.enter()
        .append("line")
        .attr("class", "median-line")
        .merge(medians)
        .transition()
        .duration(900)
        .attr("x1", d => x(d.category))
        .attr("x2", d => x(d.category) + x.bandwidth())
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", "#1b5e20")
        .attr("stroke-width", 2.5)
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    medians.exit().remove();

    // Median labels
    const medianLabels = labelGroup.selectAll(".median-label")
        .data(boxData, d => d.category);

    medianLabels.enter()
        .append("text")
        .attr("class", "median-label")
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .style("fill", "#1b5e20")
        .style("paint-order", "stroke")
        .style("stroke", "#f5f7fb")
        .style("stroke-width", 4)
        .style("stroke-linejoin", "round")
        .merge(medianLabels)
        .transition()
        .duration(900)
        .attr("x", d => x(d.category) + x.bandwidth() / 2)
        .attr("y", d => y(d.median) - 6)
        .text(d => d.median.toFixed(1))
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    medianLabels.exit().remove();

    // Min labels
    const minLabels = labelGroup.selectAll(".min-label")
        .data(boxData, d => d.category);

    minLabels.enter()
        .append("text")
        .attr("class", "min-label")
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#2f4f2f")
        .style("paint-order", "stroke")
        .style("stroke", "#f5f7fb")
        .style("stroke-width", 3)
        .style("stroke-linejoin", "round")
        .merge(minLabels)
        .transition()
        .duration(900)
        .attr("x", d => x(d.category) + x.bandwidth() / 2)
        .attr("y", d => y(d.min) + 16)
        .text(d => d.min.toFixed(1))
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    minLabels.exit().remove();

    // Max labels
    const maxLabels = labelGroup.selectAll(".max-label")
        .data(boxData, d => d.category);

    maxLabels.enter()
        .append("text")
        .attr("class", "max-label")
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#2f4f2f")
        .style("paint-order", "stroke")
        .style("stroke", "#f5f7fb")
        .style("stroke-width", 3)
        .style("stroke-linejoin", "round")
        .merge(maxLabels)
        .transition()
        .duration(900)
        .attr("x", d => x(d.category) + x.bandwidth() / 2)
        .attr("y", d => y(d.max) - 8)
        .text(d => d.max.toFixed(1))
        .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

    maxLabels.exit().remove();

    function applyFocusState() {
        whiskerGroup.selectAll("line")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

        boxGroup.selectAll(".box-rect")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 0.78);

        boxGroup.selectAll(".median-line")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);

        pointGroup.selectAll(".raw-point")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.12 : 0.28);

        labelGroup.selectAll("text")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedCategory && d.category !== selectedCategory ? 0.2 : 1);
    }
}

function updateInsightText(filterValue, focusedCategory) {
    const insight = document.getElementById("chartInsight");
    const filteredData = getFilteredData(filterValue);
    const boxData = buildBoxData(filteredData);

    let text = "";

    if (focusedCategory) {
        const selectedBox = boxData.find(d => d.category === focusedCategory);

        text = `For <strong>${getMotivationLabel(filterValue)}</strong>, students with extracurricular activity set to <strong>${selectedBox.category}</strong> have a median exam score of <strong>${selectedBox.median.toFixed(1)}</strong>, with scores ranging from <strong>${selectedBox.min.toFixed(1)}</strong> to <strong>${selectedBox.max.toFixed(1)}</strong>, based on <strong>${selectedBox.count}</strong> students.`;
    } else {
        const yesBox = boxData.find(d => d.category === "Yes");
        const noBox = boxData.find(d => d.category === "No");
        const difference = (yesBox.median - noBox.median).toFixed(1);

        text = `For <strong>${getMotivationLabel(filterValue)}</strong>, students involved in extracurricular activities have a median score of <strong>${yesBox.median.toFixed(1)}</strong> compared with <strong>${noBox.median.toFixed(1)}</strong> for students who are not involved. This ${difference}-point difference suggests that extracurricular participation may be associated with slightly stronger academic performance overall.`;
    }

    insight.innerHTML = `
        <div class="insight-box">
            <div class="insight-title">Key Insight</div>
            <p class="insight-text">${text}</p>
        </div>
    `;
}