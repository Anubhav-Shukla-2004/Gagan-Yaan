from flask import Flask, request, jsonify
import pickle
import pandas as pd

app = Flask(__name__)

# Load the trained model and feature names
model = pickle.load(open("model.pkl", "rb"))
feature_columns = pickle.load(open("features.pkl", "rb"))

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Extract form data
        source = request.form.get('source')
        destination = request.form.get('destination')
        airline = request.form.get('airline')
        total_stops = int(request.form.get('total-stops'))
        dep_datetime = request.form.get('departure-datetime')
        arr_datetime = request.form.get('arrival-datetime')

        # Convert to datetime objects
        dep_date = pd.to_datetime(dep_datetime)
        arr_date = pd.to_datetime(arr_datetime)

        # Validate that arrival is after departure...
        if arr_date <= dep_date:
            return jsonify({"result": "Error: Arrival date and time must be later than departure date and time."})
        # ...and that arrival is within 24 hours of departure.
        if (arr_date - dep_date).total_seconds() > 24 * 3600:
            return jsonify({"result": "Error: Arrival date and time must be within 24 hours from departure date."})
        
        # Compute duration details
        duration_hours = (arr_date - dep_date).seconds // 3600
        duration_minutes = ((arr_date - dep_date).seconds // 60) % 60

        # Prepare input features
        input_data = {
            'Total_Stops': [total_stops],
            'Journey_Day': [dep_date.day],
            'Journey_Month': [dep_date.month],
            'Dep_hour': [dep_date.hour],
            'Dep_Minute': [dep_date.minute],
            'Arrival_hour': [arr_date.hour],
            'Arrival_Minute': [arr_date.minute],
            'Duration_Hour': [duration_hours],
            'Duration_Minute': [duration_minutes],
            'Airline': [airline],
            'Source': [source],
            'Destination': [destination]
        }

        # Convert to DataFrame, one-hot encode, and align columns
        input_df = pd.DataFrame(input_data)
        input_df = pd.get_dummies(input_df)
        for col in feature_columns:
            if col not in input_df.columns:
                input_df[col] = 0
        input_df = input_df[feature_columns]

        # Make the prediction
        prediction = model.predict(input_df)[0]
        predicted_fare = f"Predicted Fare: ₹{round(prediction, 2)}"
        return jsonify({"result": predicted_fare})

    except Exception as e:
        print("Error during prediction:", e)
        return jsonify({"result": "Server Error"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)