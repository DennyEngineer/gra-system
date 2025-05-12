import { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import data from "../data.json";

ChartJS.register(ArcElement, Tooltip, Legend);

function TaxSourceBreakdown() {
  const [taxSources, setTaxSources] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const regions = data.regions;
    const totalSalaryTaxpayers = regions.reduce((sum, r) => sum + r.salaryTaxpayers, 0);
    const totalEVatTaxpayers = regions.reduce((sum, r) => sum + r.eVatTaxpayers, 0);
    const totalOtherTaxpayers = regions.reduce((sum, r) => sum + r.otherTaxpayers, 0);

    const chartData = {
      labels: ["Salary Taxpayers", "E-VAT Taxpayers", "Other Taxpayers"],
      datasets: [
        {
          data: [totalSalaryTaxpayers, totalEVatTaxpayers, totalOtherTaxpayers],
          backgroundColor: [
            "rgba(30, 58, 138, 0.8)",
            "rgba(20, 184, 166, 0.8)",
            "rgba(100, 116, 139, 0.8)",
          ],
          borderColor: ["rgba(30, 58, 138, 1)", "rgba(20, 184, 166, 1)", "rgba(100, 116, 139, 1)"],
          borderWidth: 1,
          hoverBackgroundColor: [
            "rgba(30, 58, 138, 0.9)",
            "rgba(20, 184, 166, 0.9)",
            "rgba(100, 116, 139, 0.9)",
          ],
        },
      ],
    };

    setTaxSources({ totalSalaryTaxpayers, totalEVatTaxpayers, totalOtherTaxpayers, chartData, regions });
  }, []);

  // Filter regions by search
  const filteredRegions = taxSources.regions?.filter((region) =>
    region.region.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredRegions.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = ["Region", "Salary Taxpayers", "E-VAT Taxpayers", "Other Taxpayers"];
    const rows = filteredRegions.map((region) => [
      `"${region.region}"`,
      region.salaryTaxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.eVatTaxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.otherTaxpayers.toLocaleString("en-US", { useGrouping: false }),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `tax_source_breakdown_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pie chart options
  const chartOptions = {
    responsive: true,
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
        callbacks: {
          label: (context) => `${context.label}: ${context.raw.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 font-sans">Tax Source Breakdown</h1>
            <p className="text-gray-600 mt-2 text-lg">Distribution of taxpayers by source across Ghana</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
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
              Export Breakdown
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            {
              title: "Salary Taxpayers",
              value: taxSources.totalSalaryTaxpayers?.toLocaleString(),
              icon: (
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
            },
            {
              title: "E-VAT Taxpayers",
              value: taxSources.totalEVatTaxpayers?.toLocaleString(),
              icon: (
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              ),
            },
            {
              title: "Other Taxpayers",
              value: taxSources.totalOtherTaxpayers?.toLocaleString(),
              icon: (
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  <p className="text-3xl font-semibold text-gray-800">{card.value}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-teal-100">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pie Chart Section */}
        {taxSources.chartData && (
          <div className="mb-8 bg-gradient-to-br from-blue-900 to-teal-900 p-6 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4">Taxpayer Source Distribution</h2>
            <div className="max-w-md mx-auto h-80">
              <Pie data={taxSources.chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Table Section */}
        {taxSources.regions && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Regional Tax Source Breakdown</h2>
                <p className="text-sm text-gray-600 mt-1">Taxpayer distribution by region and source</p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
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
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-100 to-teal-100">
                  <tr>
                    {[
                      { label: "Region" },
                      { label: "Salary Taxpayers" },
                      { label: "E-VAT Taxpayers" },
                      { label: "Other Taxpayers" },
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{region.salaryTaxpayers.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{region.eVatTaxpayers.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{region.otherTaxpayers.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                        No regions found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredRegions.length}</span> of{" "}
                <span className="font-medium">{taxSources.regions?.length}</span> regions
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaxSourceBreakdown;  