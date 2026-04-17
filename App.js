import React, { useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import "./App.css";

function App() {

  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const COLORS = ["#4ade80", "#fbbf24", "#f87171"]; // Green, Amber, Red

  // 🔹 Analyze API
  const analyzeData = async () => {
    if (!file) {
      alert("Please upload CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/analyze",
        formData
      );
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Error analyzing file");
    }
  };

  // 🔹 Download PDF
  const downloadReport = async () => {
    if (!file) {
      alert("Upload CSV first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      "http://127.0.0.1:5000/download-report",
      formData,
      { responseType: "blob" }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Student_Report.pdf");
    document.body.appendChild(link);
    link.click();
  };

  // 📊 Bar Chart Data
  const chartData = result
    ? Object.entries(result.predictions).map(([name, marks]) => ({
        name,
        marks
      }))
    : [];

  // 🥧 Pie Chart Data
  const statusData = result
    ? result.status.reduce((acc, curr) => {
        const found = acc.find(item => item.name === curr.Status);
        if (found) found.value++;
        else acc.push({ name: curr.Status, value: 1 });
        return acc;
      }, [])
    : [];

  return (
    <div className="dashboard">

      <h1 className="title">Student Performance Dashboard</h1>

{/* Upload Section */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          setFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: "2px dashed #4ade80",
          padding: "40px",
          borderRadius: "12px",
          textAlign: "center",
          marginBottom: "50px", // Pushes the cards further down
          background: "rgba(255, 255, 255, 0.05)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px" // Creates space between text, input, and buttons
        }}
      >
        <div>
          <h3 style={{ margin: "0" }}>📂 Drag & Drop CSV File</h3>
          <p style={{ opacity: 0.7 }}>or click below to upload</p>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ cursor: "pointer" }}
        />

        {/* Buttons are now INSIDE the green border */}
        <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
          <button className="btn-primary" onClick={analyzeData}>
            Analyze
          </button>

          <button className="btn-secondary" onClick={downloadReport}>
            Download PDF
          </button>
        </div>
      </div>
      {loading && (
       <div style={{ textAlign: "center", color: "white" }}>
        <h3>Cleaning Data & Analyzing...</h3>
        <div className="spinner"></div>
      </div>
     )}
  {/* Stats */}
      {result && (
        <div className="stats">
          <div className="stat-card">
            <h3>Average Marks</h3>
            <p>{result.average}</p>
          </div>

          <div className="stat-card">
            <h3>Top Student</h3>
            <p>{result.top_student}</p>
          </div>

          <div className="stat-card">
            <h3>Low Performer</h3>
            <p>{result.low_student}</p>
          </div>
        </div>
      )}

{/* Bar Chart */}
      {result && (
        <div className="chart-card">
          <h2>Performance Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="marks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

{/* 🧠 COMBINED TABLE */}
      {result && (
        <div className="card">
          <h2>Student Performance Table</h2>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Weak Subject</th>
              </tr>
            </thead>

            <tbody>
              {result.status.map((s, index) => {
                const mark = result.predictions[s.StudentName];
                const weak = result.weak_subject.find(
                  w => w.StudentName === s.StudentName
                );

                return (
                  <tr key={index}>
                    <td>{s.StudentName}</td>
                    <td>{mark.toFixed(2)}</td>
                    <td>
                      {s.Status === "At Risk" && "🔴 At Risk"}
                      {s.Status === "Average" && "🟡 Average"}
                      {s.Status === "Good" && "🟢 Good"}
                    </td>
                    <td>{weak?.WeakSubject}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

{/* 🏆 Leaderboard */}
{result && (
  <div className="card">
    <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
      <span>🏆</span> Top 3 Students
    </h2>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {result.leaderboard.map((s, i) => (
        <div 
          key={i} 
          className="leaderboard-item"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            borderLeft: i === 0 ? "4px solid #ffd700" : "4px solid transparent" // Gold border for #1
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={{ 
              fontWeight: "bold", 
              color: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : "#cd7f32",
              fontSize: "18px"
            }}>
              #{i + 1}
            </span>
            <span style={{ fontWeight: "500", fontSize: "16px" }}>{s.StudentName}</span>
          </div>
          
          <div style={{ 
            background: "#4ade80", 
            color: "#0f172a", 
            padding: "4px 12px", 
            borderRadius: "20px", 
            fontWeight: "bold",
            fontSize: "14px"
          }}>
            {s.FinalMarks} Marks
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/* 🥧 Pie Chart */}
    {result && (
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Student Distribution</h2>

       <div style={{ width: "100%", height: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ResponsiveContainer width="100%" height="100%">
          <PieChart>
          <Pie
            data={statusData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60} // Optional: Makes it a Donut Chart for a modern look
            paddingAngle={5}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {statusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
 {/* Manual Legend */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            {statusData.map((entry, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    </div>
  );
}

export default App;