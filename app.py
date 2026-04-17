from flask import Flask, request, jsonify, send_file
import pandas as pd
from sklearn.linear_model import LinearRegression
from flask_cors import CORS
from reportlab.platypus import SimpleDocTemplate, Table
import os

app = Flask(__name__)
CORS(app)

def get_flexible_columns(df):
    """Helper function to find columns regardless of exact naming."""
    # Find Name column (looks for 'name' in any column title)
    name_col = next((col for col in df.columns if 'name' in col.lower()), df.columns[0])
    
    # Find all numeric columns (these are our subjects/marks)
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    
    # Exclude columns that are usually NOT subjects (like ID)
    subjects = [col for col in numeric_cols if 'id' not in col.lower()]
    
    return name_col, subjects

@app.route("/")
def home():
    return "Student Performance API Running"

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        file = request.files["file"]
        df = pd.read_csv(file).dropna()

        name_col, subjects = get_flexible_columns(df)

        # Calculate a "FinalMarks" column if it doesn't exist by averaging all subjects
        if "FinalMarks" not in df.columns:
            df["FinalMarks"] = df[subjects].mean(axis=1)

        # ML Prediction: We use all subjects to predict the final outcome
        # (Using a simple mean as a baseline if only one numeric col exists)
        X = df[subjects]
        y = df["FinalMarks"]
        model = LinearRegression().fit(X, y)
        df["PredictedMarks"] = model.predict(X)

        # 🔴 Risk Detection
        def get_status(mark):
            if mark < 40: return "At Risk"
            elif mark < 60: return "Average"
            else: return "Good"

        df["Status"] = df["PredictedMarks"].apply(get_status)

        # 🧠 Weak Subject (finds the column name with the lowest value for that row)
        df["WeakSubject"] = df[subjects].idxmin(axis=1)

        # 🏆 Leaderboard
        top3 = df.sort_values(by="FinalMarks", ascending=False).head(3)
        leaderboard = top3[[name_col, "FinalMarks"]].rename(columns={name_col: "StudentName"}).to_dict(orient="records")

        # 📊 Predictions Mapping
        predictions = dict(zip(df[name_col], df["PredictedMarks"]))

        result = {
            "average": float(df["FinalMarks"].mean()),
            "top_student": str(df.loc[df["FinalMarks"].idxmax()][name_col]),
            "low_student": str(df.loc[df["FinalMarks"].idxmin()][name_col]),
            "predictions": predictions,
            "status": df[[name_col, "Status"]].rename(columns={name_col: "StudentName"}).to_dict(orient="records"),
            "weak_subject": df[[name_col, "WeakSubject"]].rename(columns={name_col: "StudentName"}).to_dict(orient="records"),
            "leaderboard": leaderboard
        }
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/download-report", methods=["POST"])
def download_report():
    file = request.files["file"]
    df = pd.read_csv(file).dropna()
    
    name_col, subjects = get_flexible_columns(df)
    df["WeakSubject"] = df[subjects].idxmin(axis=1)

    data = [["Student Name", "Weakest Area"]]
    for _, row in df.iterrows():
        data.append([str(row[name_col]), str(row["WeakSubject"])])

    pdf_file = "student_report.pdf"
    pdf = SimpleDocTemplate(pdf_file)
    table = Table(data)
    pdf.build([table])

    return send_file(pdf_file, as_attachment=True, download_name="Student_Performance_Report.pdf")

if __name__ == "__main__":
    app.run(debug=True)