import { LightningElement, wire, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getBoatsByLocation from '@salesforce/apex/BoatDataService.getBoatsByLocation';


const LABEL_YOU_ARE_HERE = 'You are here!';
const ICON_STANDARD_USER = 'standard:user';
const ERROR_TITLE = 'Error loading Boats Near Me';
const ERROR_VARIANT = 'error';
export default class BoatsNearMe extends LightningElement {
  @api boatTypeId;
  @track mapMarkers = [];
  isLoading = true;
  isRendered;
  @api latitude;
  @api longitude;
  
  // Add the wired method from the Apex Class
  // Name it getBoatsByLocation, and use latitude, longitude and boatTypeId
  // Handle the result and calls createMapMarkers
  @wire(getBoatsByLocation, { latitude: '$latitude', longitude: '$longitude', boatTypeId : '$boatTypeId' })
  wiredBoatsJSON({error, data}) {
    console.log('wire!')
    if(data){
      this.createMapMarkers(JSON.parse(data));
      this.isLoading = false;
    }
    else if(error){
      this.mapMarkers = [];
      this.error = error;
      this.dispatchEvent(
        new ShowToastEvent({
            title: ERROR_TITLE,
            message: error,
            variant: ERROR_VARIANT
        })
      );
    }
  }
  
  // Controls the isRendered property
  // Calls getLocationFromBrowser()
  renderedCallback() {
    if (!this.isRendered) {
      this.getLocationFromBrowser();
      this.isRendered = true;
    }
  }
  
  // Gets the location from the Browser
  // position => {latitude and longitude}
  getLocationFromBrowser() {
    navigator.geolocation.getCurrentPosition((position)=> {
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
    });
  }
  
  // Creates the map markers
  createMapMarkers(boatData) {
    const newMarkers = boatData.map(boat => {
      return {
        location: {
          Latitude: boat.Geolocation__Latitude__s,
          Longitude: boat.Geolocation__Longitude__s
        },
        title: boat.Name
      }
    });
    newMarkers.unshift({
      location: {
        Latitude: this.latitude,
        Longitude: this.longitude
      },
      title: LABEL_YOU_ARE_HERE,
      icon: ICON_STANDARD_USER
    });
    this.mapMarkers = newMarkers;
    this.isLoading = false;
    console.log('markers created')
  }
}