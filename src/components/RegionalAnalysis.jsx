import { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import data from "../data.json";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function RegionalAnalysis() {
  const [regionalData, setRegionalData] = useState({ regions: [], chartData: null });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const chartRef = useRef(null);

  useEffect(() => {
    // Cleanup chart on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const regions = data.regions;
    const chartData = {
      labels: regions.map((r) => r.region),
      datasets: [
        {
          label: "Average Tax Paid (GHS)",
          data: regions.map((r) => r.averageTax),
          backgroundColor: "rgba(30, 58, 138, 0.8)",
          borderColor: "rgba(30, 58, 138, 1)",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.35,
          hoverBackgroundColor: "rgba(20, 184, 166, 0.9)",
        },
        {
          label: "Compliance Rate (%)",
          data: regions.map((r) => r.complianceRate * 100),
          backgroundColor: "rgba(20, 184, 166, 0.8)",
          borderColor: "rgba(20, 184, 166, 1)",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.35,
          hoverBackgroundColor: "rgba(30, 58, 138, 0.9)",
        },
      ],
    };

    setRegionalData({ regions, chartData });
  }, []);

  const handleRegionClick = (region) => {
    setSelectedRegion(region);
  };

  const clearSelection = () => {
    setSelectedRegion(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Filter by tab and search
  const filteredRegions = regionalData.regions
    .filter((region) => {
      if (activeTab === "high") return region.complianceRate >= 0.8;
      if (activeTab === "medium") return region.complianceRate >= 0.5 && region.complianceRate < 0.8;
      if (activeTab === "low") return region.complianceRate < 0.5;
      return true;
    })
    .filter((region) => region.region.toLowerCase().includes(searchQuery.toLowerCase()));

  // Export to CSV
  const exportToCSV = () => {
    if (filteredRegions.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = [
      "Region",
      "Taxpayers",
      "Avg. Tax (GHS)",
      "Total Tax (GHS)",
      "Compliance (%)",
      "Salary (%)",
      "E-VAT (%)",
    ];
    const rows = filteredRegions.map((region) => [
      `"${region.region}"`,
      region.taxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.averageTax.toLocaleString("en-US", { useGrouping: false }),
      region.totalTax.toLocaleString("en-US", { useGrouping: false }),
      (region.complianceRate * 100).toFixed(1),
      ((region.salaryTaxpayers / region.taxpayers) * 100).toFixed(1),
      ((region.eVatTaxpayers / region.taxpayers) * 100).toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `regional_tax_data_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          label: (context) =>
            `${context.dataset.label}: ${context.raw.toFixed(
              context.dataset.label.includes("%") ? 1 : 0
            )}${context.dataset.label.includes("GHS") ? " GHS" : "%"}`,
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
    interaction: { mode: "index", intersect: false },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 font-sans">Regional Tax Analysis</h1>
            <p className="text-gray-600 mt-2 text-lg">Comparative metrics across Ghana’s regions</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="bg-white/80 backdrop-blur-md p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
              <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        {regionalData.chartData && (
          <div className="mb-8 bg-gradient-to-br from-blue-900 to-teal-900 p-6 rounded-xl shadow-lg animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Regional Performance Overview</h2>
                <p className="text-sm text-gray-200 mt-1">Average tax and compliance by region</p>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors">
                  Annual
                </button>
                <button className="px-3 py-1.5 text-sm bg-white/20 text-white rounded-md hover:bg-white/30 transition-colors">
                  Quarterly
                </button>
              </div>
            </div>
            <div className="h-80">
              <Bar ref={chartRef} data={regionalData.chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Region Details Panel */}
        {selectedRegion && (
          <div className="mb-8 bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedRegion.region} Region</h2>
                <babel className="text-sm text-gray-600">Detailed taxpayer metrics</babel>
              </div>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: "100ms" }}>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Taxpayer Demographics</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Total Taxpayers</p>
                    <p className="text-lg font-semibold">{selectedRegion.taxpayers.toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Salary</p>
                      <p className="font-medium">
                        {selectedRegion.salaryTaxpayers.toLocaleString()} (
                        {((selectedRegion.salaryTaxpayers / selectedRegion.taxpayers) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">E-VAT</p>
                      <p className="font-medium">
                        {selectedRegion.eVatTaxpayers.toLocaleString()} (
                        {((selectedRegion.eVatTaxpayers / selectedRegion.taxpayers) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Other</p>
                      <p className="font-medium">
                        {selectedRegion.otherTaxpayers.toLocaleString()} (
                        {((selectedRegion.otherTaxpayers / selectedRegion.taxpayers) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: "200ms" }}>
                <h3 className="text-sm font-medium text-teal-800 mb-2">Tax Revenue</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Total Tax Collected</p>
                    <p className="text-lg font-semibold">GHS {selectedRegion.totalTax.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Average Tax Paid</p>
                    <p className="font-medium">GHS {selectedRegion.averageTax.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: "300ms" }}>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Compliance Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Compliance Rate</p>
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-teal-500 h-2 rounded-full"
                          style={{ width: `${selectedRegion.complianceRate * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-medium">{(selectedRegion.complianceRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Compliance Ranking</p>
                    <p className="font-medium">
                      #{regionalData.regions
                        .sort((a, b) => b.complianceRate - a.complianceRate)
                        .findIndex((r) => r.region === selectedRegion.region) + 1}{" "}
                      of {regionalData.regions.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regions Table */}
        {regionalData.regions && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Regional Tax Data</h2>
                <p className="text-sm text-gray-600 mt-1">Click any row for detailed metrics</p>
              </div>
              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  <svg
                    className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === "all"
                        ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    All Regions
                  </button>
                  <button
                    onClick={() => setActiveTab("high")}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === "high"
                        ? "bg-gradient-to-r from-green-600 to-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    High Compliance
                  </button>
                  <button
                    onClick={() => setActiveTab("medium")}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === "medium"
                        ? "bg-gradient-to-r from-yellow-600 to-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setActiveTab("low")}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeTab === "low"
                        ? "bg-gradient-to-r from-red-600 to-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    Low
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-100 to-teal-100">
                  <tr>
                    {[
                      { label: "Region" },
                      { label: "Taxpayers" },
                      { label: "Avg. Tax (GHS)" },
                      { label: "Total Tax (GHS)" },
                      { label: "Compliance" },
                      { label: "Salary %" },
                      { label: "E-VAT %" },
                    ].map((header) => (
                      <th
                        key={header.label}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                      >
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRegions.length > 0 ? (
                    filteredRegions.map((region) => (
                      <tr
                        key={region.region}
                        onClick={() => handleRegionClick(region)}
                        className={`cursor-pointer transition-colors ${
                          selectedRegion?.region === region.region ? "bg-teal-50" : "hover:bg-teal-50"
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-200 to-teal-200 rounded-lg flex items-center justify-center">
                              <span className="text-blue-800 font-medium">{region.region.substring(0, 2)}</span>
                            </div>
                            <div className="ml-4 flex items-center">
                              <span className="font-medium text-gray-900">{region.region}</span>
                              {region.complianceRate >= 0.8 && (
                                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">High</span>
                              )}
                              {region.complianceRate >= 0.5 && region.complianceRate < 0.8 && (
                                <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Medium</span>
                              )}
                              {region.complianceRate < 0.5 && (
                                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Low</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{region.taxpayers.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{region.averageTax.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{region.totalTax.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  region.complianceRate >= 0.8 ? "bg-teal-500" : region.complianceRate >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${region.complianceRate * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{(region.complianceRate * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {((region.salaryTaxpayers / region.taxpayers) * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {((region.eVatTaxpayers / region.taxpayers) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        No regions found matching "{searchQuery}" for {activeTab} compliance
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredRegions.length}</span> of{" "}
                <span className="font-medium">{regionalData.regions.length}</span> regions
              </div>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-medium rounded-lg hover:scale-105 active:scale-95 transition-transform flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegionalAnalysis;