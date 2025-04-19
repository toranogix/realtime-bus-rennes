# Realtime Bus Tracker - Rennes

A real-time bus tracking application for the Rennes metropolitan area, showing the current position of all STAR buses on an interactive map.

![Bus Tracker Screenshot](screenshot.png)

## Features

- **Real-time Bus Tracking**: See the current position of all STAR buses on an interactive map (MapBox)
- **Bus Status Information**: View bus status (in service, delayed, out of service)
- **Traffic Alerts**: Get notified about traffic disruptions affecting bus lines
- **Search Functionality**: Search for specific bus lines


## Technologies Used

- **Mapbox GL JS**: For rendering the interactive map
- **JavaScript**: For application logic and data handling
- **HTML/CSS**: For the user interface
- **STAR API**: For real-time bus position data and traffic alerts

## Getting Started

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/realtime-bus-Rennes.git
   ```

2. Navigate to the project directory:
   ```
   cd realtime-bus-Rennes
   ```

3. Make sure you have the latest version of node.js. Run the command using this line of code:
    ```
    npx http-server
    ```

## Usage

- **View Bus Positions**: The map automatically displays all active buses
- **Check Bus Status**: Hover over a bus to see basic information, click for detailed information
- **View Traffic Alerts**: Click the alerts widget to see current traffic disruptions
- **Search for a Bus Line**: Use the search bar to filter buses by line number


## Data Sources

This application uses the following STAR API:

- Bus positions: `https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-vehicules-position-tr/exports/geojson`
- Bus lanes: `https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-topologie-parcours-td/exports/geojson`
- Traffic alerts: `https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-busmetro-trafic-alertes-tr/records`
- Bus icons: `https://data.explore.star.fr/api/explore/v2.1/catalog/datasets/tco-bus-lignes-pictogrammes-dm/records`

## Project Structure

```
realtime-bus-Rennes/
├── index.html              # Main HTML file
├── static/
│   ├── css/
│   │   └── style.css       # CSS styles
│   └── js/
│       └── map.js          # JavaScript for map functionality
└── README.md               
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [STAR](https://www.star.fr/) for providing the bus data
- [Mapbox](https://www.mapbox.com/) for the mapping technology
- [OpenStreetMap](https://www.openstreetmap.org/) for the base map data

## Contact

Omar.D - [GitHub](https://github.com/toranogix)

Project Link: [https://github.com/yourusername/realtime-bus-Rennes](https://github.com/yourusername/realtime-bus-Rennes) 