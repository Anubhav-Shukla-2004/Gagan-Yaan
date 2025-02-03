import streamlit as st
import os
import pandas as pd
import pickle
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor

# Title of the app
st.title("Flight Price Prediction App")

# Paths to model and feature files
model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
features_path = os.path.join(os.path.dirname(__file__), 'features.pkl')

# Check if model exists, else retrain
if not os.path.exists(model_path) or not os.path.exists(features_path):
    st.warning("Model not found. Retraining...")

    # Load dataset
    flight = pd.read_excel('FlightData.xlsx')

    # Preprocessing
    flight.dropna(inplace=True)
    flight['Journey_Day'] = pd.to_datetime(flight.Date_of_Journey, format='%d/%m/%Y').dt.day
    flight['Journey_Month'] = pd.to_datetime(flight.Date_of_Journey, format='%d/%m/%Y').dt.month
    flight.drop(columns=['Date_of_Journey'], inplace=True)

    # Convert categorical variables to numerical
    flight = pd.get_dummies(flight, drop_first=True)

    # Feature selection
    x = flight.drop(columns=['Price'], axis=1)
    y = flight['Price']

    # Train the model
    model = RandomForestRegressor()
    model.fit(x, y)

    # Save model and feature columns
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)

    with open(features_path, 'wb') as f:
        pickle.dump(x.columns, f)

    st.success("Model retrained and saved.")

# Load model and feature names
model = pickle.load(open(model_path, 'rb'))
feature_columns = pickle.load(open(features_path, 'rb'))

# User Input Form
st.header("Enter Flight Details")

# Load dataset for dropdown options
flight = pd.read_excel('FlightData.xlsx')

# Input selections
airline = st.selectbox("Select Airline", flight['Airline'].unique())
source = st.selectbox("Select Source", flight['Source'].unique())
destination = st.selectbox("Select Destination", flight['Destination'].unique())

journey_day = st.number_input("Journey Day", min_value=1, max_value=31)
journey_month = st.number_input("Journey Month", min_value=1, max_value=12)
duration_hour = st.number_input("Duration (Hours)", min_value=0, max_value=24)
duration_minute = st.number_input("Duration (Minutes)", min_value=0, max_value=60)
dep_hour = st.number_input("Departure Hour", min_value=0, max_value=23)
dep_minute = st.number_input("Departure Minute", min_value=0, max_value=59)

stops_mapping = {'Non-stop': 0, '1 stop': 1, '2 stops': 2, '3 stops': 3, '4 stops': 4}
stops = st.selectbox("Total Stops", list(stops_mapping.keys()))
total_stops = stops_mapping[stops]

# Prepare input data
input_data = {
    'Airline': [airline],
    'Source': [source],
    'Destination': [destination],
    'Journey_Day': [journey_day],
    'Journey_Month': [journey_month],
    'Duration_Hour': [duration_hour],
    'Duration_Minute': [duration_minute],
    'Dep_hour': [dep_hour],
    'Dep_Minute': [dep_minute],
    'Total_Stops': [total_stops]
}

input_df = pd.DataFrame(input_data)

# One-hot encode input to match model training
input_df = pd.get_dummies(input_df)

# Ensure input_df has the same columns as training data
for col in feature_columns:
    if col not in input_df.columns:
        input_df[col] = 0  # Add missing columns

# Match the column order
input_df = input_df[feature_columns]

# Predict the price
if st.button("Predict Price"):
    prediction = model.predict(input_df)
    st.success(f"The predicted flight price is: ₹{prediction[0]:.2f}")

# Sidebar for Data Insights
st.sidebar.header("Flight Data Insights")

if st.sidebar.checkbox("Show Correlation Heatmap"):
    # Drop non-numeric columns before plotting
    numeric_flight = flight.select_dtypes(include=['number'])
    
    fig, ax = plt.subplots(figsize=(10, 10))
    sns.heatmap(numeric_flight.corr(), annot=True, cmap='RdYlGn', ax=ax)
    st.pyplot(fig)  # Pass figure explicitly

