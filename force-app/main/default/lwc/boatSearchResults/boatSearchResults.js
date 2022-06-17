import { LightningElement, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { publish, MessageContext } from 'lightning/messageService';
import BOATMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import { updateRecord } from 'lightning/uiRecordApi';

const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT     = 'Ship it!';
const SUCCESS_VARIANT     = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';

const columns = [
  {label: 'Name', fieldName: 'Name', editable: true},
  {label: 'Length', fieldName: 'Length__c', type: 'number', editable: true},
  {label: 'Price', fieldName: 'Price__c', type: 'currency', typeAttributes: {currencyCode: 'USD', maximumFractionDigits: '2'}, editable: true},
  {label: 'Description', fieldName: 'Description__c', editable: true}
];

export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = columns;

  @api boatTypeId = '';
  boats;
  isLoading = false;
  
  // wired message context
  @wire(MessageContext)
  messageContext;
  // wired getBoats method
  @wire(getBoats, {boatTypeId: '$boatTypeId'})
  wiredBoats(result) {
    if (result) {
      this.boats = result;
    }
  }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api searchBoats(boatTypeId) {
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    this.boatTypeId = boatTypeId;
    this.isLoading = false;
    this.notifyLoading(this.isLoading);
  }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  async refresh() {
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    await refreshApex(this.boats);
    this.isLoading = false;
    this.notifyLoading(this.isLoading);
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) {
    this.selectedBoatId = event.detail.boatId;
    this.sendMessageService(this.selectedBoatId);
  }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    const payload = { recordId: boatId };
    publish(this.messageContext, BOATMC, payload);
  }
  
  // The handleSave method must save the changes in the Boat Editor
  // passing the updated fields from draftValues to the 
  // Apex method updateBoatList(Object data).
  // Show a toast message with the title
  // clear lightning-datatable draft values
  async handleSave(event) {
    // notify loading
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    const updatedFields = event.detail.draftValues.slice().map(draft => {
      const fields = Object.assign({}, draft);
      return { fields };
    });

    const promises = updatedFields.map(updatedField => updateRecord(updatedField));
    Promise.all(promises).then(res => {
      this.dispatchEvent(new ShowToastEvent({
        title: SUCCESS_TITLE,
        message: MESSAGE_SHIP_IT,
        variant: SUCCESS_VARIANT
      }));
      this.draftValues = [];
      return this.refresh();
    }).catch(error => {
      this.dispatchEvent(new ShowToastEvent({
        title: ERROR_TITLE,
        message: error.body.fieldErrors.Id[0].message,
        variant: ERROR_VARIANT
      }));
      this.notifyLoading(false);
    }).finally(() => {
      this.draftValues = [];
    });
    // // Update the records via Apex
    // await updateBoatList({data: updatedFields})
    // .then((result) => {
    //   if (result) {
    //     this.dispatchEvent(new ShowToastEvent({
    //         title: SUCCESS_TITLE,
    //         message: MESSAGE_SHIP_IT,
    //         variant: SUCCESS_VARIANT
    //     }));
    //     this.refresh();
    //   }
    // })
    // .catch(error => {
    //   if (error) {
    //     this.dispatchEvent(new ShowToastEvent({
    //         title: ERROR_TITLE,
    //         message: error.body.fieldErrors.Id[0].message,
    //         variant: ERROR_VARIANT
    //     }));
    //   }
    // })
    // .finally(() => {
    //   event.detail.draftValues = [];
    //   this.draftValues = [];
    //   this.isLoading = false;
    //   this.notifyLoading(this.isLoading);
    // });
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) {
    if (isLoading) {
      this.dispatchEvent(new CustomEvent('loading'));
    } else {
      this.dispatchEvent(new CustomEvent('doneloading'));
    }
  }
}