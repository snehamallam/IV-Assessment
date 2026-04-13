d3.csv("IV_Dataset.csv").then(function(data) {
    data.forEach(d => {
        d.Attendance = +d.Attendance;
        d.Sleep_Hours = +d.Sleep_Hours;
        d.Hours_Studied = +d.Hours_Studied;
        d.Tutoring_Sessions = +d.Tutoring_Sessions;
        d.Exam_Score = +d.Exam_Score;
        d.Extracurricular_Activities = d.Extracurricular_Activities.trim().toLowerCase();
    });

    const width = 700;
    const height = 560;
    const radius = 200;
    const levels = 5;

    const labels = [
        "Attendance",
        "Sleep Hours",
        "Hours Studied",
        "Tutoring Sessions",
        "Extracurricular\nActivities"
    ];

    const dataKeys = [
        "Attendance",
        "Sleep_Hours",
        "Hours_Studied",
        "Tutoring_Sessions",
        "Extracurricular_Activities"
    ];

    const angleSlice = (2 * Math.PI) / labels.length;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block")
        .style("margin", "0 auto");

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const gridGroup = chartGroup.append("g");
    const axisGroup = chartGroup.append("g");
    const polygonGroup = chartGroup.append("g");
    const pointGroup = chartGroup.append("g");
    const valueLabelGroup = chartGroup.append("g");

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

    let selectedFactor = null;
    let currentFilter = "All";

    const ranges = {
        Attendance: {
            min: d3.min(data, d => d.Attendance),
            max: d3.max(data, d => d.Attendance)
        },
        Sleep_Hours: {
            min: d3.min(data, d => d.Sleep_Hours),
            max: d3.max(data, d => d.Sleep_Hours)
        },
        Hours_Studied: {
            min: d3.min(data, d => d.Hours_Studied),
            max: d3.max(data, d => d.Hours_Studied)
        },
        Tutoring_Sessions: {
            min: d3.min(data, d => d.Tutoring_Sessions),
            max: d3.max(data, d => d.Tutoring_Sessions)
        },
        Extracurricular_Activities: {
            min: 0,
            max: 1
        }
    };

    function normalize(value, min, max) {
        if (max === min) return 0;
        return (value - min) / (max - min);
    }

    function getFilteredData(filterValue) {
        if (filterValue === "Below80") {
            return data.filter(d => d.Exam_Score < 80);
        }
        if (filterValue === "80to90") {
            return data.filter(d => d.Exam_Score >= 80 && d.Exam_Score <= 90);
        }
        if (filterValue === "Above90") {
            return data.filter(d => d.Exam_Score > 90);
        }
        return data;
    }

    function getFilterLabel(filterValue) {
        if (filterValue === "Below80") return "Below 80";
        if (filterValue === "80to90") return "80 - 90";
        if (filterValue === "Above90") return "Above 90";
        return "All students";
    }

    function buildRadarData(filtered) {
        const avgAttendance = d3.mean(filtered, d => d.Attendance);
        const avgSleep = d3.mean(filtered, d => d.Sleep_Hours);
        const avgHours = d3.mean(filtered, d => d.Hours_Studied);
        const avgTutoring = d3.mean(filtered, d => d.Tutoring_Sessions);
        const avgActivities = d3.mean(filtered, d => d.Extracurricular_Activities === "yes" ? 1 : 0);

        const rawValues = [
            avgAttendance,
            avgSleep,
            avgHours,
            avgTutoring,
            avgActivities
        ];

        const normalizedValues = [
            normalize(avgAttendance, ranges.Attendance.min, ranges.Attendance.max),
            normalize(avgSleep, ranges.Sleep_Hours.min, ranges.Sleep_Hours.max),
            normalize(avgHours, ranges.Hours_Studied.min, ranges.Hours_Studied.max),
            normalize(avgTutoring, ranges.Tutoring_Sessions.min, ranges.Tutoring_Sessions.max),
            normalize(avgActivities, ranges.Extracurricular_Activities.min, ranges.Extracurricular_Activities.max)
        ];

        return labels.map((label, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            return {
                label: label.replace("\n", " "),
                displayLabel: label,
                key: dataKeys[i],
                rawValue: rawValues[i],
                normalizedValue: normalizedValues[i],
                percentValue: normalizedValues[i] * 100,
                angle: angle,
                x: radius * normalizedValues[i] * Math.cos(angle),
                y: radius * normalizedValues[i] * Math.sin(angle),
                axisX: radius * Math.cos(angle),
                axisY: radius * Math.sin(angle)
            };
        });
    }

    function drawStaticFrame() {
        gridGroup.selectAll("*").remove();
        axisGroup.selectAll("*").remove();

        for (let level = 1; level <= levels; level++) {
            const r = radius * (level / levels);

            gridGroup.append("circle")
                .attr("r", r)
                .attr("fill", "none")
                .attr("stroke", "#d6d6d6");

            gridGroup.append("text")
                .attr("x", 0)
                .attr("y", -r + 4)
                .attr("text-anchor", "middle")
                .style("font-size", "11px")
                .style("fill", "#777")
                .text(`${Math.round((level / levels) * 100)}%`);
        }

        labels.forEach((label, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            axisGroup.append("line")
                .attr("class", "axis-line")
                .attr("data-key", dataKeys[i])
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", y)
                .attr("stroke", "#999")
                .attr("stroke-width", 1.2);

            const text = axisGroup.append("text")
                .attr("x", x * 1.28)
                .attr("y", y * 1.28)
                .attr("text-anchor", "middle")
                .style("font-size", "13px");

            text.selectAll("tspan")
                .data(label.split("\n"))
                .enter()
                .append("tspan")
                .attr("x", x * 1.28)
                .attr("dy", (d, j) => j ? "1.2em" : 0)
                .text(d => d);
        });
    }

    function updateRadar(filterValue) {
        const filtered = getFilteredData(filterValue);
        if (filtered.length === 0) return;

        const radarData = buildRadarData(filtered);

        drawStaticFrame();

        const line = d3.lineRadial()
            .radius(d => radius * d.normalizedValue)
            .angle((d, i) => i * angleSlice)
            .curve(d3.curveLinearClosed);

        const polygon = polygonGroup.selectAll(".radar-area")
            .data([radarData]);

        polygon.enter()
            .append("path")
            .attr("class", "radar-area")
            .attr("fill", "#66bb6a")
            .attr("fill-opacity", 0.35)
            .attr("stroke", "#2e7d32")
            .attr("stroke-width", 2.5)
            .merge(polygon)
            .transition()
            .duration(900)
            .attr("d", line)
            .attr("opacity", selectedFactor ? 0.65 : 1);

        const points = pointGroup.selectAll(".radar-point")
            .data(radarData, d => d.key);

        points.enter()
            .append("circle")
            .attr("class", "radar-point")
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

                axisGroup.selectAll(".axis-line")
                    .attr("stroke", a => a === undefined ? "#999" : "#999");

                axisGroup.select(`line[data-key='${d.key}']`)
                    .attr("stroke", "#2e7d32")
                    .attr("stroke-width", 2.2);

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d.label}</strong><br>
                        <strong>Normalized:</strong> ${d.percentValue.toFixed(1)}%<br>
                        <strong>Average raw value:</strong> ${formatRawValue(d)}<br>
                        <strong>Group:</strong> ${getFilterLabel(filterValue)}
                    `);
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", selectedFactor === d.key ? 8 : 6)
                    .attr("stroke", selectedFactor === d.key ? "#163d19" : "none")
                    .attr("stroke-width", selectedFactor === d.key ? 2 : 0);

                restoreAxisState();
                tooltip.style("opacity", 0);
            })
            .on("click", function(event, d) {
                if (selectedFactor === d.key) {
                    selectedFactor = null;
                } else {
                    selectedFactor = d.key;
                }

                applyFocusState(radarData);
                updateInsightText(filterValue, selectedFactor, radarData);
            })
            .merge(points)
            .transition()
            .duration(900)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => selectedFactor === d.key ? 8 : 6)
            .attr("fill", "#2e7d32")
            .attr("stroke", d => selectedFactor === d.key ? "#163d19" : "none")
            .attr("stroke-width", d => selectedFactor === d.key ? 2 : 0)
            .attr("opacity", d => selectedFactor && d.key !== selectedFactor ? 0.35 : 1);

        points.exit().remove();

        const valueLabels = valueLabelGroup.selectAll(".value-label")
            .data(radarData, d => d.key);

        valueLabels.enter()
            .append("text")
            .attr("class", "value-label")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("fill", "#1b5e20")
            .style("paint-order", "stroke")
            .style("stroke", "#f5f7fb")
            .style("stroke-width", 4)
            .style("stroke-linejoin", "round")
            .merge(valueLabels)
            .transition()
            .duration(900)
            .attr("x", d => d.x)
            .attr("y", d => d.y - 12)
            .text(d => `${d.percentValue.toFixed(0)}%`)
            .attr("opacity", d => selectedFactor && d.key !== selectedFactor ? 0.35 : 1);

        valueLabels.exit().remove();

        if (!selectedFactor) {
            updateInsightText(filterValue, null, radarData);
        } else {
            applyFocusState(radarData);
        }

        function restoreAxisState() {
            axisGroup.selectAll(".axis-line")
                .attr("stroke", lineKey => selectedFactor === lineKey.getAttribute ? "#2e7d32" : "#999");

            axisGroup.selectAll(".axis-line")
                .attr("stroke", function() {
                    const key = d3.select(this).attr("data-key");
                    return selectedFactor === key ? "#2e7d32" : "#999";
                })
                .attr("stroke-width", function() {
                    const key = d3.select(this).attr("data-key");
                    return selectedFactor === key ? 2.2 : 1.2;
                });
        }

        function applyFocusState(currentRadarData) {
            pointGroup.selectAll(".radar-point")
                .transition()
                .duration(250)
                .attr("opacity", d => selectedFactor && d.key !== selectedFactor ? 0.35 : 1)
                .attr("r", d => selectedFactor === d.key ? 8 : 6)
                .attr("stroke", d => selectedFactor === d.key ? "#163d19" : "none")
                .attr("stroke-width", d => selectedFactor === d.key ? 2 : 0);

            valueLabelGroup.selectAll(".value-label")
                .transition()
                .duration(250)
                .attr("opacity", d => selectedFactor && d.key !== selectedFactor ? 0.35 : 1)
                .style("font-size", d => selectedFactor === d.key ? "13px" : "12px");

            polygonGroup.selectAll(".radar-area")
                .transition()
                .duration(250)
                .attr("opacity", selectedFactor ? 0.65 : 1);

            axisGroup.selectAll(".axis-line")
                .transition()
                .duration(250)
                .attr("stroke", function() {
                    const key = d3.select(this).attr("data-key");
                    return selectedFactor === key ? "#2e7d32" : "#999";
                })
                .attr("stroke-width", function() {
                    const key = d3.select(this).attr("data-key");
                    return selectedFactor === key ? 2.2 : 1.2;
                });
        }
    }

    function formatRawValue(d) {
        if (d.key === "Attendance") return `${d.rawValue.toFixed(1)} attendance`;
        if (d.key === "Sleep_Hours") return `${d.rawValue.toFixed(1)} hours`;
        if (d.key === "Hours_Studied") return `${d.rawValue.toFixed(1)} hours`;
        if (d.key === "Tutoring_Sessions") return `${d.rawValue.toFixed(1)} sessions`;
        if (d.key === "Extracurricular_Activities") return `${(d.rawValue * 100).toFixed(1)}% yes`;
        return d.rawValue.toFixed(1);
    }

    function updateInsightText(filterValue, focusedFactor, radarData) {
        const insight = document.getElementById("chartInsight");
        if (!insight) return;

        let text = "";

        if (focusedFactor) {
            const selectedItem = radarData.find(d => d.key === focusedFactor);

            text = `For <strong>${getFilterLabel(filterValue)}</strong>, <strong>${selectedItem.label}</strong> has a normalized value of <strong>${selectedItem.percentValue.toFixed(1)}%</strong>, with an average raw value of <strong>${formatRawValue(selectedItem)}</strong>. These are normalized averages rather than raw percentages, allowing very different variables to be compared fairly on one radar chart.`;
        } else {
            const highest = radarData.reduce((a, b) => a.percentValue > b.percentValue ? a : b);
            const lowest = radarData.reduce((a, b) => a.percentValue < b.percentValue ? a : b);

            text = `These percentages are normalized averages, not raw percentages. For <strong>${getFilterLabel(filterValue)}</strong>, the strongest relative factor is <strong>${highest.label}</strong> at <strong>${highest.percentValue.toFixed(1)}%</strong>, while the lowest is <strong>${lowest.label}</strong> at <strong>${lowest.percentValue.toFixed(1)}%</strong>. This helps compare different performance-related factors on the same scale.`;
        }

        insight.innerHTML = `
            <div class="insight-box">
                <div class="insight-title">Key Insight</div>
                <p class="insight-text">${text}</p>
            </div>
        `;
    }

    updateRadar("All");
    updateInsightText("All", null, buildRadarData(data));

    d3.select("#filter").on("change", function() {
        currentFilter = this.value;
        selectedFactor = null;
        updateRadar(currentFilter);
    });
});