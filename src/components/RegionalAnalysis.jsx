import { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function RegionalAnalysis() {
  const [regionalData, setRegionalData] = useState({ regions: [], chartData: null });
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(2025);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
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

        // Process data for the selected year
        const processedRegions = regions.map((region) => {
          const yearData = region.yearlyData.find((d) => d.year === selectedYear) || {
            taxpayers: 0,
            averageTax: 0,
            totalTax: 0,
            salaryTaxpayers: 0,
            eVatTaxpayers: 0,
            otherTaxpayers: 0,
            complianceRate: 0,
          };
          return { region: region.region, ...yearData };
        });

        const chartData = {
          labels: processedRegions.map((r) => r.region),
          datasets: [
            {
              label: `Average Tax Paid (GHS) ${selectedYear}`,
              data: processedRegions.map((r) => r.averageTax),
              backgroundColor: "rgba(30, 58, 138, 0.8)",
              borderColor: "rgba(30, 58, 138, 1)",
              borderWidth: 1,
              borderRadius: 8,
              barPercentage: 0.35,
              hoverBackgroundColor: "rgba(20, 184, 166, 0.9)",
            },
            {
              label: `Compliance Rate (%) ${selectedYear}`,
              data: processedRegions.map((r) => r.complianceRate * 100),
              backgroundColor: "rgba(20, 184, 166, 0.8)",
              borderColor: "rgba(20, 184, 166, 1)",
              borderWidth: 1,
              borderRadius: 8,
              barPercentage: 0.35,
              hoverBackgroundColor: "rgba(30, 58, 138, 0.9)",
            },
          ],
        };

        setRegionalData({ regions: processedRegions, chartData });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data from Firestore. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, [selectedYear]);

  const handleRegionClick = (region) => {
    setSelectedRegion(region);
    setEditMode(false);
    setEditForm(null);
  };

  const clearSelection = () => {
    setSelectedRegion(null);
    setEditMode(false);
    setEditForm(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const enterEditMode = () => {
    setEditMode(true);
    setEditForm({
      taxpayers: selectedRegion.taxpayers,
      averageTax: selectedRegion.averageTax,
      totalTax: selectedRegion.totalTax,
      salaryTaxpayers: selectedRegion.salaryTaxpayers,
      eVatTaxpayers: selectedRegion.eVatTaxpayers,
      otherTaxpayers: selectedRegion.otherTaxpayers,
      complianceRate: selectedRegion.complianceRate,
    });
    setSaveError(null);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value === "" ? "" : parseFloat(value) || 0,
    }));
  };

  const validateForm = () => {
    const errors = [];
    const {
      taxpayers,
      averageTax,
      totalTax,
      salaryTaxpayers,
      eVatTaxpayers,
      otherTaxpayers,
      complianceRate,
    } = editForm;

    if (taxpayers < 0) errors.push("Taxpayers cannot be negative.");
    if (averageTax < 0) errors.push("Average Tax cannot be negative.");
    if (totalTax < 0) errors.push("Total Tax cannot be negative.");
    if (salaryTaxpayers < 0) errors.push("Salary Taxpayers cannot be negative.");
    if (eVatTaxpayers < 0) errors.push("E-VAT Taxpayers cannot be negative.");
    if (otherTaxpayers < 0) errors.push("Other Taxpayers cannot be negative.");
    if (complianceRate < 0 || complianceRate > 1) errors.push("Compliance Rate must be between 0 and 1.");
    if (salaryTaxpayers + eVatTaxpayers + otherTaxpayers > taxpayers) {
      errors.push("Sum of Salary, E-VAT, and Other Taxpayers cannot exceed Total Taxpayers.");
    }

    return errors;
  };

  const saveEdits = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setSaveError(errors.join(" "));
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const regionRef = doc(db, "regions", selectedRegion.region);
      const snapshot = await getDocs(collection(db, "regions"));
      const regionData = snapshot.docs.find((d) => d.data().region === selectedRegion.region).data();

      const updatedYearlyData = regionData.yearlyData.map((data) =>
        data.year === selectedYear ? { ...editForm, year: selectedYear } : data
      );

      if (!regionData.yearlyData.some((data) => data.year === selectedYear)) {
        updatedYearlyData.push({ ...editForm, year: selectedYear });
      }

      await updateDoc(regionRef, { yearlyData: updatedYearlyData });

      // Update local state
      setRegionalData((prev) => {
        const updatedRegions = prev.regions.map((r) =>
          r.region === selectedRegion.region ? { ...editForm, region: r.region } : r
        );
        const chartData = {
          labels: updatedRegions.map((r) => r.region),
          datasets: [
            {
              label: `Average Tax Paid (GHS) ${selectedYear}`,
              data: updatedRegions.map((r) => r.averageTax),
              backgroundColor: "rgba(30, 58, 138, 0.8)",
              borderColor: "rgba(30, 58, 138, 1)",
              borderWidth: 1,
              borderRadius: 8,
              barPercentage: 0.35,
              hoverBackgroundColor: "rgba(20, 184, 166, 0.9)",
            },
            {
              label: `Compliance Rate (%) ${selectedYear}`,
              data: updatedRegions.map((r) => r.complianceRate * 100),
              backgroundColor: "rgba(20, 184, 166, 0.8)",
              borderColor: "rgba(20, 184, 166, 1)",
              borderWidth: 1,
              borderRadius: 8,
              barPercentage: 0.35,
              hoverBackgroundColor: "rgba(30, 58, 138, 0.9)",
            },
          ],
        };
        return { regions: updatedRegions, chartData };
      });

      setSelectedRegion({ ...editForm, region: selectedRegion.region });
      setEditMode(false);
      setEditForm(null);
    } catch (err) {
      console.error("Error saving data:", err);
      setSaveError("Failed to save changes to Firestore. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
    setSaveError(null);
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
      "Year",
      "Taxpayers",
      "Avg. Tax (GHS)",
      "Total Tax (GHS)",
      "Compliance (%)",
      "Salary (%)",
      "E-VAT (%)",
    ];
    const rows = filteredRegions.map((region) => [
      `"${region.region}"`,
      selectedYear,
      region.taxpayers.toLocaleString("en-US", { useGrouping: false }),
      region.averageTax.toLocaleString("en-US", { useGrouping: false }),
      region.totalTax.toLocaleString("en-US", { useGrouping: false }),
      (region.complianceRate * 100).toFixed(1),
      region.taxpayers ? ((region.salaryTaxpayers / region.taxpayers) * 100).toFixed(1) : "0.0",
      region.taxpayers ? ((region.eVatTaxpayers / region.taxpayers) * 100).toFixed(1) : "0.0",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `regional_tax_data_${selectedYear}_${date}.csv`);
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
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center text-gray-600 animate-pulse">Loading data...</div>
        )}
        {error && (
          <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">{error}</div>
        )}

        {/* Chart Section */}
        {!loading && regionalData.chartData && (
          <div className="mb-8 bg-gradient-to-br from-blue-900 to-teal-900 p-6 rounded-xl shadow-lg animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Regional Performance Overview</h2>
                <p className="text-sm text-gray-200 mt-1">Average tax and compliance by region ({selectedYear})</p>
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
        {!loading && selectedRegion && (
          <div className="mb-8 bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedRegion.region} Region ({selectedYear})</h2>
                <p className="text-sm text-gray-600">Detailed taxpayer metrics</p>
              </div>
              <div className="flex space-x-2">
                {!editMode ? (
                  <button
                    onClick={enterEditMode}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveEdits}
                      disabled={saving}
                      className={`px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform flex items-center ${
                        saving ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className={`px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:scale-105 transition-transform flex items-center ${
                        saving ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </>
                )}
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
            </div>
            {saveError && (
              <div className="mb-4 text-center text-red-600 bg-red-100 p-4 rounded-lg">{saveError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: "100ms" }}>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Taxpayer Demographics</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Total Taxpayers</p>
                    {editMode ? (
                      <input
                        type="number"
                        value={editForm.taxpayers}
                        onChange={(e) => handleEditChange("taxpayers", e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                        min="0"
                      />
                    ) : (
                      <p className="text-lg font-semibold">{selectedRegion.taxpayers.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Salary</p>
                      {editMode ? (
                        <input
                          type="number"
                          value={editForm.salaryTaxpayers}
                          onChange={(e) => handleEditChange("salaryTaxpayers", e.target.value)}
                          className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                          min="0"
                        />
                      ) : (
                        <p className="font-medium">
                          {selectedRegion.salaryTaxpayers.toLocaleString()} (
                          {selectedRegion.taxpayers ? ((selectedRegion.salaryTaxpayers / selectedRegion.taxpayers) * 100).toFixed(1) : "0.0"}%)
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">E-VAT</p>
                      {editMode ? (
                        <input
                          type="number"
                          value={editForm.eVatTaxpayers}
                          onChange={(e) => handleEditChange("eVatTaxpayers", e.target.value)}
                          className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                          min="0"
                        />
                      ) : (
                        <p className="font-medium">
                          {selectedRegion.eVatTaxpayers.toLocaleString()} (
                          {selectedRegion.taxpayers ? ((selectedRegion.eVatTaxpayers / selectedRegion.taxpayers) * 100).toFixed(1) : "0.0"}%)
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Other</p>
                      {editMode ? (
                        <input
                          type="number"
                          value={editForm.otherTaxpayers}
                          onChange={(e) => handleEditChange("otherTaxpayers", e.target.value)}
                          className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                          min="0"
                        />
                      ) : (
                        <p className="font-medium">
                          {selectedRegion.otherTaxpayers.toLocaleString()} (
                          {selectedRegion.taxpayers ? ((selectedRegion.otherTaxpayers / selectedRegion.taxpayers) * 100).toFixed(1) : "0.0"}%)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: "200ms" }}>
                <h3 className="text-sm font-medium text-teal-800 mb-2">Tax Revenue</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Total Tax Collected</p>
                    {editMode ? (
                      <input
                        type="number"
                        value={editForm.totalTax}
                        onChange={(e) => handleEditChange("totalTax", e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                        min="0"
                      />
                    ) : (
                      <p className="text-lg font-semibold">GHS {selectedRegion.totalTax.toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Average Tax Paid</p>
                    {editMode ? (
                      <input
                        type="number"
                        value={editForm.averageTax}
                        onChange={(e) => handleEditChange("averageTax", e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                        min="0"
                      />
                    ) : (
                      <p className="font-medium">GHS {selectedRegion.averageTax.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 p-4 rounded-lg animate-fade-in" style={{ animationDelay: "300ms" }}>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Compliance Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Compliance Rate</p>
                    {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.complianceRate}
                        onChange={(e) => handleEditChange("complianceRate", e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                        min="0"
                        max="1"
                      />
                    ) : (
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-teal-500 h-2 rounded-full"
                            style={{ width: `${selectedRegion.complianceRate * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{(selectedRegion.complianceRate * 100).toFixed(1)}%</span>
                      </div>
                    )}
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
        {!loading && regionalData.regions && (
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Regional Tax Data ({selectedYear})</h2>
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
                          {region.taxpayers ? ((region.salaryTaxpayers / region.taxpayers) * 100).toFixed(1) : "0.0"}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {region.taxpayers ? ((region.eVatTaxpayers / region.taxpayers) * 100).toFixed(1) : "0.0"}%
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
