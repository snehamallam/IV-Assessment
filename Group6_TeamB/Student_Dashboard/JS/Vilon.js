const margin = { top: 40, right: 40, bottom: 80, left: 80 },
      width = 900 - margin.left - margin.right,
      height = 460 - margin.top - margin.bottom;

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
const violinsGroup = chartGroup.append("g");
const rawPointsGroup = chartGroup.append("g");
const labelsGroup = chartGroup.append("g");

chartGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height + 60)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Number of Tutoring Sessions");

chartGroup.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -55)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Exam Score");

const tooltip = d3.select("#tooltip")
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
let selectedTutoringGroup = null;
let currentFilter = "All";

d3.csv("IV_Dataset.csv").then(function(data) {
    data.forEach(d => {
        d.Tutoring_Sessions = +d.Tutoring_Sessions;
        d.Exam_Score = +d.Exam_Score;
    });

    fullData = data;

    updateChart("All");
    updateInsightText("All", null);

    d3.select("#educationFilter").on("change", function() {
        currentFilter = this.value;
        selectedTutoringGroup = null;
        updateChart(currentFilter);
        updateInsightText(currentFilter, null);
    });
});

function getFilteredData(filterValue) {
    if (filterValue === "All") return fullData;
    return fullData.filter(d => d.Parental_Education_Level === filterValue);
}

function buildGroupedData(filteredData) {
    const grouped = d3.group(filteredData, d => d.Tutoring_Sessions);
    const tutoringLevels = Array.from(grouped.keys()).sort((a, b) => a - b);

    return tutoringLevels.map(level => {
        const values = grouped.get(level) || [];
        const scores = values
            .map(d => d.Exam_Score)
            .filter(v => !isNaN(v));

        return {
            session: level,
            values: values,
            scores: scores,
            count: scores.length,
            avg: scores.length ? d3.mean(scores) : 0,
            median: scores.length ? d3.median(scores) : 0,
            min: scores.length ? d3.min(scores) : 0,
            max: scores.length ? d3.max(scores) : 0
        };
    });
}

function getEducationLabel(filterValue) {
    return filterValue === "All" ? "All parental education groups" : filterValue;
}

function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        v = v / k;
        return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}

function updateChart(filterValue) {
    const filteredData = getFilteredData(filterValue);
    const groupedData = buildGroupedData(filteredData);

    const validScores = filteredData
        .map(d => d.Exam_Score)
        .filter(v => !isNaN(v));

    const overallAverage = d3.mean(validScores);

    const minScore = Math.max(0, d3.min(validScores) - 5);
    const maxScore = Math.min(100, d3.max(validScores) + 5);

    const x = d3.scaleBand()
        .domain(groupedData.map(d => d.session))
        .range([0, width])
        .padding(0.12);

    const y = d3.scaleLinear()
        .domain([minScore, maxScore])
        .nice()
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

    xAxisGroup.selectAll("text")
        .filter((d, i) => i === 0)
        .attr("dx", "8px")
        .style("text-anchor", "start");

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

    // Lower smoothing so violin follows data more closely
    const kde = kernelDensityEstimator(kernelEpanechnikov(3), y.ticks(40));

    const violinData = groupedData.map(group => {
        const density = group.count >= 5 ? kde(group.scores) : [];
        return {
            ...group,
            density: density,
            maxDensity: density.length ? d3.max(density, d => d[1]) : 0
        };
    });

    // ---------- VIOLINS / SMALL-GROUP LINES ----------
    const violinShapes = violinsGroup.selectAll(".violin-shape")
        .data(violinData, d => d.session);

    violinShapes.enter()
        .append("path")
        .attr("class", "violin-shape")
        .attr("fill", "#66bb6a")
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 1.2)
        .merge(violinShapes)
        .transition()
        .duration(900)
        .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.22 : 0.65)
        .attr("d", function(d) {
            if (d.count < 5 || d.maxDensity === 0) {
                return "";
            }

            const scaleWidth = d3.scaleLinear()
                .range([0, x.bandwidth() / 2])
                .domain([0, d.maxDensity]);

            return d3.area()
                .x0(p => x(d.session) + x.bandwidth() / 2 - scaleWidth(p[1]))
                .x1(p => x(d.session) + x.bandwidth() / 2 + scaleWidth(p[1]))
                .y(p => y(p[0]))
                .curve(d3.curveCatmullRom)(d.density);
        });

    violinShapes.exit().remove();

    // Small groups: draw a thin vertical line instead of fake violin
    const smallGroupLines = violinsGroup.selectAll(".small-group-line")
        .data(violinData.filter(d => d.count < 5), d => d.session);

    smallGroupLines.enter()
        .append("line")
        .attr("class", "small-group-line")
        .attr("stroke", "#2e7d32")
        .attr("stroke-width", 2)
        .merge(smallGroupLines)
        .transition()
        .duration(900)
        .attr("x1", d => x(d.session) + x.bandwidth() / 2)
        .attr("x2", d => x(d.session) + x.bandwidth() / 2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.22 : 0.9);

    smallGroupLines.exit().remove();

    // ---------- RAW DATA POINTS ----------
    const jitteredPoints = [];
    violinData.forEach(group => {
        const center = x(group.session) + x.bandwidth() / 2;
        const jitterWidth = Math.max(6, x.bandwidth() / 3);

        group.scores.forEach((score, i) => {
            jitteredPoints.push({
                session: group.session,
                score: score,
                avg: group.avg,
                median: group.median,
                min: group.min,
                max: group.max,
                count: group.count,
                education: getEducationLabel(filterValue),
                xPos: center + (group.count < 5 ? 0 : (Math.random() - 0.5) * jitterWidth)
            });
        });
    });

    const points = rawPointsGroup.selectAll(".raw-point")
        .data(jitteredPoints, (d, i) => `${d.session}-${d.score}-${i}`);

    points.enter()
        .append("circle")
        .attr("class", "raw-point")
        .attr("r", 0)
        .attr("fill", "#1b5e20")
        .attr("stroke", "white")
        .attr("stroke-width", 0.4)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("r", 4.5)
                .attr("fill", "#0f4d1a");

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Tutoring Sessions:</strong> ${d.session}<br>
                    <strong>Students:</strong> ${d.count}<br>
                    <strong>Average Score:</strong> ${d.avg.toFixed(1)}<br>
                    <strong>Median Score:</strong> ${d.median.toFixed(1)}<br>
                    <strong>Min:</strong> ${d.min.toFixed(1)}<br>
                    <strong>Max:</strong> ${d.max.toFixed(1)}<br>
                    <strong>Score:</strong> ${d.score.toFixed(1)}<br>
                    <strong>Parental Education:</strong> ${d.education}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("r", 2.8)
                .attr("fill", "#1b5e20");

            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (selectedTutoringGroup === d.session) {
                selectedTutoringGroup = null;
            } else {
                selectedTutoringGroup = d.session;
            }
            applyFocusState(filterValue);
            updateInsightText(filterValue, selectedTutoringGroup);
        })
        .merge(points)
        .transition()
        .duration(900)
        .attr("cx", d => d.xPos)
        .attr("cy", d => y(d.score))
        .attr("r", 2.8)
        .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.18 : 0.45);

    points.exit().remove();

    // ---------- INTERACTIVE HIT AREAS ----------
    const hitAreas = violinsGroup.selectAll(".violin-hit")
        .data(violinData, d => d.session);

    hitAreas.enter()
        .append("rect")
        .attr("class", "violin-hit")
        .attr("fill", "transparent")
        .merge(hitAreas)
        .attr("x", d => x(d.session))
        .attr("y", 0)
        .attr("width", x.bandwidth())
        .attr("height", height)
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Tutoring Sessions:</strong> ${d.session}<br>
                    <strong>Students:</strong> ${d.count}<br>
                    <strong>Average Score:</strong> ${d.avg.toFixed(1)}<br>
                    <strong>Median Score:</strong> ${d.median.toFixed(1)}<br>
                    <strong>Min:</strong> ${d.min.toFixed(1)}<br>
                    <strong>Max:</strong> ${d.max.toFixed(1)}<br>
                    <strong>Parental Education:</strong> ${getEducationLabel(filterValue)}
                `);

            violinsGroup.selectAll(".violin-shape")
                .attr("opacity", v => {
                    if (selectedTutoringGroup !== null) {
                        return v.session === selectedTutoringGroup ? 0.75 : 0.22;
                    }
                    return v.session === d.session ? 0.82 : 0.35;
                })
                .attr("stroke-width", v => v.session === d.session ? 2 : 1.2);

            violinsGroup.selectAll(".small-group-line")
                .attr("opacity", v => {
                    if (selectedTutoringGroup !== null) {
                        return v.session === selectedTutoringGroup ? 0.95 : 0.22;
                    }
                    return v.session === d.session ? 1 : 0.35;
                })
                .attr("stroke-width", v => v.session === d.session ? 3 : 2);

            rawPointsGroup.selectAll(".raw-point")
                .attr("opacity", p => {
                    if (selectedTutoringGroup !== null) {
                        return p.session === selectedTutoringGroup ? 0.55 : 0.18;
                    }
                    return p.session === d.session ? 0.7 : 0.12;
                });

            labelsGroup.selectAll(".median-label")
                .attr("opacity", l => {
                    if (selectedTutoringGroup !== null) {
                        return l.session === selectedTutoringGroup ? 1 : 0.25;
                    }
                    return l.session === d.session ? 1 : 0.35;
                });
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            applyFocusState(filterValue);
        })
        .on("click", function(event, d) {
            if (selectedTutoringGroup === d.session) {
                selectedTutoringGroup = null;
            } else {
                selectedTutoringGroup = d.session;
            }
            applyFocusState(filterValue);
            updateInsightText(filterValue, selectedTutoringGroup);
        });

    hitAreas.exit().remove();

    // ---------- LABELS ----------
    const labels = labelsGroup.selectAll(".median-label")
        .data(violinData, d => d.session);

    labels.enter()
        .append("text")
        .attr("class", "median-label")
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "700")
        .style("fill", "#0f4d1a")
        .merge(labels)
        .transition()
        .duration(900)
        .attr("x", d => x(d.session) + x.bandwidth() / 2)
        .attr("y", d => y(d.median) - 12)
        .text(d => d.median.toFixed(1))
        .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.25 : 1);

    labels.exit().remove();

    function applyFocusState(activeFilterValue) {
        violinsGroup.selectAll(".violin-shape")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.22 : 0.65)
            .attr("stroke-width", d => selectedTutoringGroup !== null && d.session === selectedTutoringGroup ? 2 : 1.2);

        violinsGroup.selectAll(".small-group-line")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.22 : 0.9)
            .attr("stroke-width", d => selectedTutoringGroup !== null && d.session === selectedTutoringGroup ? 3 : 2);

        rawPointsGroup.selectAll(".raw-point")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.18 : 0.45);

        labelsGroup.selectAll(".median-label")
            .transition()
            .duration(250)
            .attr("opacity", d => selectedTutoringGroup !== null && d.session !== selectedTutoringGroup ? 0.25 : 1)
            .style("font-size", d => selectedTutoringGroup !== null && d.session === selectedTutoringGroup ? "13px" : "11px");
    }
}

function updateInsightText(filterValue, focusedSession) {
    const insight = document.getElementById("chartInsight");
    const filteredData = getFilteredData(filterValue);
    const groupedData = buildGroupedData(filteredData);

    let text = "";

    if (focusedSession !== null) {
        const selectedGroup = groupedData.find(d => d.session === focusedSession);

        text = `For <strong>${getEducationLabel(filterValue)}</strong>, students with <strong>${selectedGroup.session}</strong> tutoring sessions have a median exam score of <strong>${selectedGroup.median.toFixed(1)}</strong>, an average score of <strong>${selectedGroup.avg.toFixed(1)}</strong>, and a score range from <strong>${selectedGroup.min.toFixed(1)}</strong> to <strong>${selectedGroup.max.toFixed(1)}</strong>, based on <strong>${selectedGroup.count}</strong> students.`;
    } else {
        const highestMedian = groupedData.reduce((a, b) => a.median > b.median ? a : b);
        const lowestMedian = groupedData.reduce((a, b) => a.median < b.median ? a : b);
        const difference = (highestMedian.median - lowestMedian.median).toFixed(1);

        text = `For <strong>${getEducationLabel(filterValue)}</strong>, exam score distributions generally shift upward as tutoring sessions increase. The median score rises from <strong>${lowestMedian.median.toFixed(1)}</strong> at <strong>${lowestMedian.session}</strong> sessions to <strong>${highestMedian.median.toFixed(1)}</strong> at <strong>${highestMedian.session}</strong> sessions, a difference of <strong>${difference}</strong> points, suggesting that additional academic support is associated with improved performance.`;
    }

    insight.innerHTML = `
        <div class="insight-box">
            <div class="insight-title">Key Insight</div>
            <p class="insight-text">${text}</p>
        </div>
    `;
}