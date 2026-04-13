document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("scatterChart");
    const dropdown = document.getElementById("hoursFilter");

    let rawData = [];
    let chart;

    Papa.parse("IV_Dataset.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function (results) {
            rawData = results.data.filter(d =>
                d.Hours_Studied !== null &&
                d.Hours_Studied !== "" &&
                d.Exam_Score !== null &&
                d.Exam_Score !== "" &&
                d.Previous_Scores !== null &&
                d.Previous_Scores !== ""
            );

            const initialData = splitData(rawData);
            createChart(initialData);
            updateInsightText("all");
        }
    });

    function splitData(data) {
        const improved = [];
        const notImproved = [];

        data.forEach(d => {
            const hours = Number(d.Hours_Studied);
            const score = Number(d.Exam_Score);
            const prev = Number(d.Previous_Scores);

            if (!isNaN(hours) && !isNaN(score) && !isNaN(prev)) {
                const point = {
                    x: hours,
                    y: score,
                    previous: prev
                };

                if (score > prev) {
                    improved.push(point);
                } else {
                    notImproved.push(point);
                }
            }
        });

        return { improved, notImproved };
    }

    function getFilteredRows(range) {
        if (range === "all") return rawData;

        return rawData.filter(d => {
            const hours = Number(d.Hours_Studied);
            if (isNaN(hours)) return false;

            if (range === "1-10") return hours >= 1 && hours <= 10;
            if (range === "11-20") return hours >= 11 && hours <= 20;
            if (range === "21-30") return hours >= 21 && hours <= 30;
            if (range === "31+") return hours >= 31;

            return true;
        });
    }

    function filterData(range) {
        return splitData(getFilteredRows(range));
    }

    function createChart(data) {
        chart = new Chart(ctx, {
            type: "scatter",
            data: {
                datasets: [
                    {
                        label: "Improved",
                        data: data.improved,
                        backgroundColor: "rgba(34, 139, 34, 0.55)",
                        borderColor: "rgba(34, 139, 34, 1)",
                        pointRadius: 3,
                        pointHoverRadius: 7,
                        pointHoverBorderWidth: 2,
                        pointBorderWidth: 1,
                        pointStyle: "circle"
                    },
                    {
                        label: "Not Improved",
                        data: data.notImproved,
                        backgroundColor: "rgba(144, 238, 144, 0.60)",
                        borderColor: "rgba(60, 179, 113, 1)",
                        pointRadius: 3,
                        pointHoverRadius: 7,
                        pointHoverBorderWidth: 2,
                        pointBorderWidth: 1,
                        pointStyle: "circle"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: "easeOutQuart"
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        mode: "nearest",
                        intersect: true,
                        callbacks: {
                            label: function (context) {
                                const raw = context.raw;
                                return [
                                    `${context.dataset.label}`,
                                    `Hours Studied: ${raw.x}`,
                                    `Exam Score: ${raw.y}`,
                                    `Previous Score: ${raw.previous}`
                                ];
                            }
                        }
                    },
                    legend: {
                        position: "top",
                        labels: {
                            usePointStyle: true,
                            pointStyle: "circle",
                            pointStyleWidth: 15,
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Hours Studied",
                            font: {
                                size: 16
                            }
                        },
                        min: 0,
                        max: 45,
                        ticks: {
                            stepSize: 5
                        },
                        grid: {
                            color: "rgba(0,0,0,0.08)"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Exam Score",
                            font: {
                                size: 16
                            }
                        },
                        min: 50,
                        max: 105,
                        ticks: {
                            stepSize: 5
                        },
                        grid: {
                            color: "rgba(0,0,0,0.08)"
                        }
                    }
                }
            }
        });
    }

    function updateChart(range) {
        const filteredData = filterData(range);

        chart.data.datasets[0].data = filteredData.improved;
        chart.data.datasets[1].data = filteredData.notImproved;

        chart.update();
        updateInsightText(range);
    }

    function updateInsightText(range) {
        const insight = document.getElementById("chartInsight");
        const filteredRows = getFilteredRows(range);

        const validScores = filteredRows
            .map(d => Number(d.Exam_Score))
            .filter(score => !isNaN(score));

        const totalStudents = validScores.length;
        const avgScore = totalStudents > 0
            ? (validScores.reduce((sum, score) => sum + score, 0) / totalStudents).toFixed(1)
            : "0.0";

        let text = "";

        if (range === "1-10") {
            text = `This range includes ${totalStudents} students, with an average exam score of ${avgScore}. Students studying 1–10 hours generally achieve lower to moderate exam scores, suggesting that limited study time may reduce performance consistency.`;
        } else if (range === "11-20") {
            text = `This range includes ${totalStudents} students, with an average exam score of ${avgScore}. In the 11–20 hour range, exam scores begin to improve more consistently, suggesting that moderate study time is associated with steadier academic performance.`;
        } else if (range === "21-30") {
            text = `This range includes ${totalStudents} students, with an average exam score of ${avgScore}. Students studying 21–30 hours tend to show stronger overall performance, with many achieving higher scores. This range suggests a positive relationship between study effort and exam outcomes.`;
        } else if (range === "31+") {
            text = `This range includes ${totalStudents} students, with an average exam score of ${avgScore}. For students studying more than 30 hours, scores remain generally strong, although variation still exists. This suggests that while study time matters, other factors also influence final performance.`;
        } else {
            text = `This chart includes ${totalStudents} students, with an average exam score of ${avgScore}. Increased study time is generally associated with higher exam scores. However, the variation in results suggests that other factors, such as sleep, attendance, and motivation, also significantly influence performance.`;
        }

        insight.innerHTML = `
            <div class="insight-box">
                <div class="insight-title">Key Insight</div>
                <p class="insight-text">${text}</p>
            </div>
        `;
    }

    dropdown.addEventListener("change", function () {
        updateChart(this.value);
    });
});