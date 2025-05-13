import { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [metrics, setMetrics] = useState({ regionalMetrics: [], chartData: null });
  const [sortConfig, setSortConfig] = useState({ key: "taxpayers", direction: "desc" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [editedData, setEditedData] = useState({});
  const [isEditing, setIsEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const chartRef = useRef(null);

  // Available years (2020–2025)
  const years = Array.from({ length: 6 }, (_, i) => 2020 + i);

  useEffect(() => {
    // Cleanup chart on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    // Fetch data from Firestore
    async function fetchRegions() {
      try {
        setLoading(true);
        setError(null);
        const regionsCollection = collection(db, "regions");
        const snapshot = await getDocs(regionsCollection);
        const regions = snapshot.docs.map((doc) => doc.data());

        // Process data for the selected year, applying any edits
        const regionalMetrics = regions.map((region) => {
          const yearData = region.yearlyData.find((d) => d.year === selectedYear) || {
            taxpayers: 0,
            averageTax: 0,
            totalTax: 0,
            salaryTaxpayers: 0,
            eVatTaxpayers: 0,
            otherTaxpayers: 0,
            complianceRate: 0,
          };
          // Apply edits if they exist for this region and year
          const edited = editedData[`${region.region}_${selectedYear}`] || {};
          return { region: region.region, ...yearData, ...edited };
        });

        const totalTaxpayers = regionalMetrics.reduce((sum, r) => sum + r.taxpayers, 0);
        const totalTax = regionalMetrics.reduce((sum, r) => sum + r.totalTax, 0);
        const avgTax = totalTaxpayers > 0 ? totalTax / totalTaxpayers : 0;
        const avgCompliance =
          totalTaxpayers > 0
            ? regionalMetrics.reduce((sum, r) => sum + r.complianceRate * r.taxpayers, 0) / totalTaxpayers
            : 0;

        const chartData = {
          labels: regionalMetrics.map((r) => r.region),
          datasets: [
            {
              label: `Taxpayers by Region (${selectedYear})`,
              data: regionalMetrics.map((r) => r.taxpayers),
              backgroundColor: regionalMetrics.map(() => "rgba(30, 58, 138, 0.8)"),
              borderColor: "rgba(30, 58, 138, 1)",
              borderWidth: 1,
              borderRadius: 8,
              barPercentage: 0.7,
              hoverBackgroundColor: "rgba(20, 184, 166, 0.9)",
            },
          ],
        };

        setMetrics({ totalTaxpayers, totalTax, avgTax, avgCompliance, chartData, regionalMetrics });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data from Firestore. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, [selectedYear, editedData]);

  // Sorting function
  const sortData = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });

    const sortedMetrics = [...metrics.regionalMetrics].sort((a, b) => {
      if (key === "region") {
        return direction === "asc" ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
      }
      return direction === "asc" ? a[key] - b[key] : b[key] - a[key];
    });

    setMetrics({ ...metrics, regionalMetrics: sortedMetrics });
  };

  // Filter function
  const filteredMetrics = metrics.regionalMetrics?.filter((region) =>
    region.region.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredMetrics.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = [
      "Region",
      "Year",
      "Taxpayers",
      "Avg. Tax (GHS)",
      "Total Tax (GHS)",
      "Salary Taxpayers",
      "eVAT Taxpayers",
      "Other Taxpayers",
      "Compliance (%)",
    ];
    const rows = filteredMetrics.map((region) => [
      `"${region.region}"`,
      selectedYear,
      region.taxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.averageTax.toLocaleString("en-US", { useGrouping: false }),
      region.totalTax.toLocaleString("en-US", { useGrouping: false }),
      region.salaryTaxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.eVatTaxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.otherTaxpayers.toLocaleString("en-US", { useGrouping: false }),
      (region.complianceRate * 100).toFixed(1),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `taxpayer_data_${selectedYear}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit handling
  const startEditing = (region, field) => {
    setIsEditing({ region: region.region, field });
    setEditedData((prev) => ({
      ...prev,
      [`${region.region}_${selectedYear}`]: {
        ...prev[`${region.region}_${selectedYear}`],
        ...region,
      },
    }));
    setSaveError(null);
  };

  const handleEditChange = (region, field, value) => {
    const parsedValue = field === "complianceRate" ? parseFloat(value) / 100 : parseInt(value.replace(/,/g, "")) || 0;
    setEditedData((prev) => ({
      ...prev,
      [`${region.region}_${selectedYear}`]: {
        ...prev[`${region.region}_${selectedYear}`],
        [field]: parsedValue,
      },
    }));
  };

  const validateEdit = (data) => {
    const errors = [];
    if (data.taxpayers < 0) errors.push("Taxpayers cannot be negative.");
    if (data.averageTax < 0) errors.push("Average Tax cannot be negative.");
    if (data.totalTax < 0) errors.push("Total Tax cannot be negative.");
    if (data.salaryTaxpayers < 0) errors.push("Salary Taxpayers cannot be negative.");
    if (data.eVatTaxpayers < 0) errors.push("E-VAT Taxpayers cannot be negative.");
    if (data.otherTaxpayers < 0) errors.push("Other Taxpayers cannot be negative.");
    if (data.complianceRate < 0 || data.complianceRate > 1) errors.push("Compliance Rate must be between 0 and 100%.");
    if (data.salaryTaxpayers + data.eVatTaxpayers + data.otherTaxpayers > data.taxpayers) {
      errors.push("Sum of Salary, E-VAT, and Other Taxpayers cannot exceed Total Taxpayers.");
    }
    return errors;
  };

  const saveEdits = async () => {
    if (!isEditing) return;

    const editKey = `${isEditing.region}_${selectedYear}`;
    const editedRegionData = editedData[editKey];
    if (!editedRegionData) {
      setIsEditing(null);
      return;
    }

    const errors = validateEdit(editedRegionData);
    if (errors.length > 0) {
      setSaveError(errors.join(" "));
      return;
    }

    try {
      setLoading(true);
      setSaveError(null);
      const regionRef = doc(db, "regions", isEditing.region);
      const snapshot = await getDocs(collection(db, "regions"));
      const regionData = snapshot.docs.find((d) => d.data().region === isEditing.region).data();

      const updatedYearlyData = regionData.yearlyData.map((data) =>
        data.year === selectedYear ? { ...editedRegionData, year: selectedYear } : data
      );

      if (!regionData.yearlyData.some((data) => data.year === selectedYear)) {
        updatedYearlyData.push({ ...editedRegionData, year: selectedYear });
      }

      await updateDoc(regionRef, { yearlyData: updatedYearlyData });

      // Update local state
      setMetrics((prev) => {
        const updatedRegionalMetrics = prev.regionalMetrics.map((r) =>
          r.region === isEditing.region ? { ...editedRegionData, region: r.region } : r
        );
        const totalTaxpayers = updatedRegionalMetrics.reduce((sum, r) => sum + r.taxpayers, 0);
        const totalTax = updatedRegionalMetrics.reduce((sum, r) => sum + r.totalTax, 0);
        const avgTax = totalTaxpayers > 0 ? totalTax / totalTaxpayers : 0;
        const avgCompliance =
          totalTaxpayers > 0
            ? updatedRegionalMetrics.reduce((sum, r) => sum + r.complianceRate * r.taxpayers, 0) / totalTaxpayers
            : 0;

        const chartData = {
          labels: updatedRegionalMetrics.map((r) => r.region),
          datasets: [
            {
              label: `Taxpayers by Region (${selectedYear})`,
              data: updatedRegionalMetrics.map((r) => r.taxpayers),
              backgroundColor: updatedRegionalMetrics.map(() => "rgba(30, 58, 138, 0.8)"),
              borderColor: "rgba(30, 58, 138, 1)",
              borderWidth: 1,
              borderRadius: 8,
              barPercentage: 0.7,
              hoverBackgroundColor: "rgba(20, 184, 166, 0.9)",
            },
          ],
        };

        return {
          ...prev,
          totalTaxpayers,
          totalTax,
          avgTax,
          avgCompliance,
          chartData,
          regionalMetrics: updatedRegionalMetrics,
        };
      });

      setIsEditing(null);
    } catch (err) {
      console.error("Error saving data:", err);
      setSaveError("Failed to save changes to Firestore. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: { size: 14, family: "'Inter', sans-serif" },
          color: "#F8FAFC",
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(30, 58, 138, 0.9)",
        titleFont: { size: 14, family: "'Inter', sans-serif", weight: "bold" },
        bodyFont: { size: 13, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { font: { size: 12, family: "'Inter', sans-serif" }, color: "#F8FAFC", padding: 10 },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, family: "'Inter', sans-serif" }, color: "#F8FAFC", padding: 10 },
      },
    },
    elements: { bar: { hoverBackgroundColor: "rgba(20, 184, 166, 0.9)" } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 font-sans">National Taxpayer Dashboard</h1>
            <p className="text-gray-600 mt-2 text-lg">Real-time insights into Ghana’s tax ecosystem</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-white/80 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-teal-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="bg-white/80 backdrop-blur-md p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
              <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-medium rounded-lg hover:scale-105 active:scale-95 transition-transform flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </button>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center text-gray-600 animate-pulse">Loading data...</div>
        )}
        {error && (
          <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">{error}</div>
        )}
        {saveError && (
          <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg mb-4">{saveError}</div>
        )}

        {/* Key Metrics Cards */}
        {!loading && metrics.regionalMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                title: "Total Taxpayers",
                value: metrics.totalTaxpayers?.toLocaleString(),
                change: "12.5% from last year",
                changeType: "positive",
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
              },
              {
                title: "Total Tax Paid",
                value: `GHS ${metrics.totalTax?.toLocaleString()}`,
                change: "18.3% from last year",
                changeType: "positive",
                icon: (
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                title: "Avg. Tax Paid",
                value: `GHS ${metrics.avgTax?.toFixed(2)}`,
                change: "5.2% from last year",
                changeType: "positive",
                icon: (
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                ),
              },
              {
                title: "Compliance Rate",
                value: `${(metrics.avgCompliance * 100)?.toFixed(1)}%`,
                change: "2.1% from last year",
                changeType: "negative",
                icon: (
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
            ].map((card, index) => (
              <div
                key={card.title}
                className="bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-100 hover:scale-105 hover:shadow-xl transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">{card.title}</p>
                    <p className="text-3xl font-semibold text-gray-800 mb-3">{card.value}</p>
                    <div className={`flex items-center text-sm ${card.changeType === "positive" ? "text-teal-600" : "text-red-600"}`}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={card.changeType === "positive" ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"}
                        />
                      </svg>
                      <span>{card.change}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-teal-100">{card.icon}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chart Section */}
        {!loading && metrics.chartData && (
          <div className="mb-8 bg-gradient-to-br from-blue-900 to-teal-900 p-6 rounded-xl shadow-lg animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Taxpayer Distribution by Region</h2>
                <p className="text-sm text-gray-200 mt-1">Registered taxpayers across Ghana’s regions ({selectedYear})</p>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors">
                  Annual
                </button>
                <button className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-md hover:bg-white/30 transition-colors">
                  Quarterly
                </button>
                <button className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-md hover:bg-white/30 transition-colors">
                  Monthly
                </button>
              </div>
            </div>
            <div className="h-80">
              <Bar ref={chartRef} data={metrics.chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Table Section */}
        {!loading && metrics.regionalMetrics && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Regional Tax Data ({selectedYear})</h2>
                <p className="text-sm text-gray-600 mt-1">Detailed breakdown by administrative region</p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <div className="relative">
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search regions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-100 to-teal-100">
                  <tr>
                    {[
                      { key: "region", label: "Region" },
                      { key: "taxpayers", label: "Taxpayers" },
                      { key: "averageTax", label: "Avg. Tax (GHS)" },
                      { key: "totalTax", label: "Total Tax (GHS)" },
                      { key: "salaryTaxpayers", label: "Salary Taxpayers" },
                      { key: "eVatTaxpayers", label: "eVAT Taxpayers" },
                      { key: "otherTaxpayers", label: "Other Taxpayers" },
                      { key: "complianceRate", label: "Compliance" },
                    ].map((header) => (
                      <th
                        key={header.key}
                        onClick={() => sortData(header.key)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:text-teal-600 transition-colors"
                      >
                        <div className="flex items-center">
                          {header.label}
                          <svg
                            className={`w-4 h-4 ml-1 ${sortConfig.key === header.key ? "opacity-100" : "opacity-0"} ${sortConfig.direction === "asc" ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMetrics.length > 0 ? (
                    filteredMetrics.map((region) => (
                      <tr key={region.region} className="hover:bg-teal-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-200 to-teal-200 rounded-lg flex items-center justify-center">
                              <span className="text-blue-800 font-medium">{region.region.substring(0, 2)}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{region.region}</div>
                            </div>
                          </div>
                        </td>
                        {[
                          "taxpayers",
                          "averageTax",
                          "totalTax",
                          "salaryTaxpayers",
                          "eVatTaxpayers",
                          "otherTaxpayers",
                          "complianceRate",
                        ].map((field) => (
                          <td key={field} className="px-6 py-4 whitespace-nowrap">
                            {isEditing?.region === region.region && isEditing?.field === field ? (
                              <input
                                type="text"
                                value={
                                  field === "complianceRate"
                                    ? ((editedData[`${region.region}_${selectedYear}`]?.[field] || region[field]) * 100).toFixed(1)
                                    : (editedData[`${region.region}_${selectedYear}`]?.[field] || region[field])?.toLocaleString()
                                }
                                onChange={(e) => handleEditChange(region, field, e.target.value)}
                                onBlur={saveEdits}
                                onKeyPress={(e) => e.key === "Enter" && saveEdits()}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500"
                                autoFocus
                              />
                            ) : (
                              <div
                                className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => startEditing(region, field)}
                              >
                                {field === "complianceRate"
                                  ? `${(region[field] * 100).toFixed(1)}%`
                                  : region[field].toLocaleString()}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                        No regions found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredMetrics.length}</span> of{" "}
                <span className="font-medium">{metrics.regionalMetrics?.length}</span> regions
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  Previous
                </button>
                <button className="px-3 py-1.5 text-sm bg-teal-500 text-white border border-transparent rounded-md hover:bg-teal-600 transition-colors">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;