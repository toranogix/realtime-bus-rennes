# Author: COD
# Date: 2025-03-22
# Goal: Fetch data from Rennes API using Flask


from flask import Flask, render_template, jsonify
import requests
from datetime import datetime

app = Flask(__name__)

def fetch_data():
    url = "https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-vehicules-position-tr/exports/geojson?limit=-1&timezone=UTC&use_labels=false&epsg=4326"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        features = data.get("features", [])
        bus_data = []

        # Check data structure
        statuses = set()
        for feature in features:
            properties = feature.get("properties", {})
            status = properties.get("etat", "")
            statuses.add(str(status))


        for feature in features:
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            
            coordinates = geometry.get("coordinates", [])
            if not coordinates or len(coordinates) < 2:
                continue
                
            lon, lat = coordinates
            
            # Normalize status
            status = properties.get("etat", "")
            if isinstance(status, list):
                status = status[0] if status else ""
            status = str(status).strip()
            #print(f"Status reçu: '{status}'")  # Debug pour voir le statut exact
            
            bus_data.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lon), float(lat)]
                },
                "properties": {
                    "bus_id": properties.get("idbus", ""),
                    "numerobus": properties.get("numerobus", ""),
                    "line_name": properties.get("nomcourtligne", ""),
                    "direction": properties.get("sens", ""),
                    "destination": properties.get("destination", ""),
                    "status": status,
                    "delay_seconds": properties.get("ecartsecondes", "")
                }
            })

        return {
            "type": "FeatureCollection",
            "features": bus_data
        }

    except Exception as e:
        print("Erreur lors de la récupération ou du traitement des données :", e)
        return {"type": "FeatureCollection", "features": []}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/bus_data')
def bus_data():
    return jsonify(fetch_data())

if __name__ == '__main__':
    app.run(debug=True)


