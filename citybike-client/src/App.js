import React, { Component, setState } from "react";
import socketIOClient from "socket.io-client";
import axios from "axios";
import L from "leaflet";
import "./App.css"
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import icon from 'leaflet/dist/images/marker-icon.png';
import { Map, TileLayer, Marker, Popup } from "react-leaflet";
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

const useStyles = makeStyles({
  root: {
    width: 300,
  },
});

class App extends Component {
  constructor() {
    super();

    this.state = {
      response: false,
      endpoint: "http://127.0.0.1:4001",
      lat: 25.7751,
      lng: -80.21,
      zoom: 10,
      timestamp: "",
      historyPlaces: [],
      places: [],
      idSlider: 0,
      marks: [],
      checkedC: false
    };

    this.createMarkers = this.createMarkers.bind(this)
    this.updateInfo = this.updateInfo.bind(this)
    this.valuetext = this.valuetext.bind(this)

  }
  componentDidMount() {
    const { endpoint } = this.state;
    const socket = socketIOClient(endpoint);
    this.setState({idSlider: 0})
    this.timerID = setInterval(
      () => this.updateInfo(),
      10000
    );
    this.timerIDHistory = setInterval(
      () => this.updateInfoHistory(),
      300000
    );
  }
  async componentWillMount(){
    const req=await axios("http://api.citybik.es/v2/networks/decobike-miami-beach")
    let history = {
      id: 0,
      places: req.data.network.stations,
      timestamp: req.data.network.stations[0].timestamp
    }
    let time = new Date(history.timestamp);
    let minutes=time.getMinutes()<10?`0${time.getMinutes()}`:time.getMinutes();
    let marks=[{
      value: 0,
      label: time.getHours() + ":" + minutes
    }]
    let historyPlaces = [history]
    this.setState({
      places: req.data.network.stations,
      historyPlaces: historyPlaces,
      timestamp: req.data.network.stations[0].timestamp,
      marks: marks
    })
  }
  componentWillUnmount(){
    clearInterval(this.timerID);
    clearInterval(this.timerIDHistory);
  }

  async updateInfo(){
    if(!this.state.checkedC){
      const req=await axios("http://api.citybik.es/v2/networks/decobike-miami-beach")
      this.setState({
        places: req.data.network.stations,
        timestamp: req.data.network.stations[0].timestamp
      })
    }
  }

  async updateInfoHistory(){
    let history = {
      id: this.state.historyPlaces.length,
      places: this.state.places,
      timestamp: this.state.timestamp
    }
    if(this.state.checkedC){
      const req=await axios("http://api.citybik.es/v2/networks/decobike-miami-beach")
      history = {
        id: this.state.historyPlaces.length,
        places: req.data.network.stations,
        timestamp: req.data.network.stations[0].timestamp
      }
    }
    let time = new Date(history.timestamp);
    let minutes=time.getMinutes()<10?`0${time.getMinutes()}`:time.getMinutes();
    let newTime = time.getHours() + ":" + minutes;
    let marks = [
      ...this.state.marks,
      {
        value: history.id,
        label: newTime
      }
    ]
    let time2 = new Date(this.state.historyPlaces[0].timestamp);
    let oldMinutes = time2.getMinutes()<10?`0${time2.getMinutes()}`:time2.getMinutes();
    let oldTime = time2.getHours() + ":" + oldMinutes;
    if(newTime !== oldTime && time2<time){
      let historyPlaces = [history, ...this.state.historyPlaces]
      this.setState({
        historyPlaces: historyPlaces,
        marks: marks
      })
      console.log(historyPlaces)
    }
  }
  valuetext(value) {
    let val;
    if(this.state.historyPlaces[0]) val= this.state.historyPlaces[this.state.historyPlaces.length-1-value].timestamp;
    else val=new Date()
    return `5`;
  }
  onChange=(e,val)=>{
    let newData=this.state.historyPlaces.find((place)=> place.id===val)
    this.setState({
      places: newData.places,
      timestamp: newData.timestamp
    })
  }
  handleChange=(e)=>{
    this.setState({checkedC: !this.state.checkedC})
    if(!this.state.checkedC){
      this.setState({
        places: this.state.historyPlaces[0].places,
        timestamp: this.state.historyPlaces[0].timestamp
      })
    }
  }

  createMarkers(){
    let markers = [];
    const MarkerIcon = L.icon({
      iconSize: [13, 21],
      iconAnchor: [7, 21],
      popupAnchor: [0, -20],
      iconUrl: icon
    });
    markers = this.state.places.map((place)=> {
      let position=[place.latitude, place.longitude]
      return (
        <Marker position={position} icon={MarkerIcon} key={place.id}>
          <Popup key={place.id + "1"}>
            <span>{place.name}</span> <br/>
            <span>Empty slots: {place.empty_slots}</span> <br/>
            <span>Free bikes: {place.free_bikes}</span>
          </Popup>
        </Marker>
      )
    })
    return markers
  }

  render() {
    const { response } = this.state;
    const position = [this.state.lat, this.state.lng]

    return (
      <MuiThemeProvider>
      <div className="map">
        <h1> City Bikes in Miami </h1>

        <div className="Slider" id="Slider">
          <Typography id="discrete-slider" gutterBottom>
            Changes along the day
          </Typography>
          
          <Grid component="label" container alignItems="center" spacing={1}>
            <Grid item>Off</Grid>
            <Grid item>
              <Switch color="primary" checked={this.state.checkedC} onChange={this.handleChange} name="checkedC" />
            </Grid>
            <Grid item>On</Grid>
          </Grid>
          <Slider
            aria-labelledby="discrete-slider-custom"
            onChange={this.onChange}
            disabled={!this.state.checkedC}
            step={1}
            marks={this.state.marks}
            min={0}
            max={this.state.historyPlaces?this.state.historyPlaces.length-1:1}
          />
        </div>
        <Map center={position} zoom={this.state.zoom}>
          <TileLayer
            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {this.createMarkers()}
        </Map>
      </div>
      </MuiThemeProvider>
    );
  }
}
export default App;
