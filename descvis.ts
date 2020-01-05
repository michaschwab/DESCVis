import {DESC_MESSAGE_TYPE, DescCommunication, DescMessage, InitMessage, NewLeaseeMessage} from './communication';
import {DescListener, StrippedEvent} from "./listener";
import {delayAddEventListener} from "./dom";

export interface DescEvent {
    seqNum: number,
    event: StrippedEvent,
    sender: string
}

delayAddEventListener().then(() => {
    new DescVis(document.getElementsByTagName('svg')[0]);
});

class DescVis {
    private network: DescCommunication;
    private eventsQueue: DescEvent[] = [];
    private sequenceNumber: number = 0;
    private eventsLedger: DescEvent[] = [];
    private leasees = new Map<HTMLElement, string>();
    private listener: DescListener;

    private leaseeTimeouts = new Map<HTMLElement, number>();

    constructor(private svg: SVGElement) {
        let parts = window.location.href.match(/\?id=([a-z0-9]+)/);
        const originID = parts ? parts[1] : '';

        this.network = new DescCommunication(originID, this.receiveEvent.bind(this),
            this.onNewConnection.bind(this), this.onNewLeasee.bind(this));

        if(!originID) {
            setTimeout(() => console.log(window.location + '?id=' + this.network.getId()), 1000);
        }

        this.listener = new DescListener(this.svg, this.hearEvent.bind(this));
    }

    hearEvent(eventObj: StrippedEvent, event: Event) {
        if(!event.target) {
            return new Error('event has no target');
        }
        if(!this.network.id) {
            console.log('network not ready');
            (event as any)['stopImmediatePropagationBackup']();
            return;
        }
        const target = event.target as HTMLElement;
        const peerId = this.network.id;

        if(!this.leasees.has(target)) {
            this.leasees.set(target, peerId);
            this.network.setLeasee(eventObj.target, peerId);
        }

        if(this.leasees.get(target) !== peerId) {
            // Prevent event.
            //console.log('Can not edit this element because I am not the leader.', target);
            (event as any)['stopImmediatePropagationBackup']();
            event.stopPropagation();
            return;
        }

        const prevTimeout = this.leaseeTimeouts.get(target);
        clearTimeout(prevTimeout);
        const newTimeout = window.setTimeout(() => this.unlease(target), 1000);
        this.leaseeTimeouts.set(target, newTimeout);

        const newEvent: DescEvent = {
            'seqNum': this.sequenceNumber,
            'event': eventObj,
            'sender': this.network.id
        };
        this.sequenceNumber++;
        this.eventsLedger.push(newEvent);
        //console.log(this.sequenceNumber);
        this.network.broadcastEvent(newEvent);
    }

    unlease(element: HTMLElement) {
        this.leasees.delete(element);
        const selector = this.listener.getElementSelector(element);
        if(!selector) {
            return new Error('selector not found');
        }
        this.network.setLeasee(selector, '');
    }

    onNewLeasee(msg: NewLeaseeMessage) {
        // We are vulnerable to malicious actors here!

        // First, find the html element.
        const selector = msg.targetSelector;
        const target = document.querySelector(selector);
        if(!target) {
            return new Error(`could not find target element of leasee ${selector}`);
        }

        if(msg.leasee === '') {
            this.leasees.delete(target as HTMLElement);
        } else {
            this.leasees.set(target as HTMLElement, msg.leasee);
        }
    }

    onNewConnection(originalMsg: DescMessage): InitMessage {
        return {
            'type': DESC_MESSAGE_TYPE.NEW_CONNECTION,
            'sender': originalMsg.sender,
            'peers': originalMsg.peers as string[],
            'eventsLedger': this.eventsLedger,
        };
    }

    receiveEvent(remoteEvent: DescEvent) {
        let eventObject: StrippedEvent = remoteEvent.event;

        if (remoteEvent.seqNum >= this.sequenceNumber){
            this.sequenceNumber = remoteEvent.seqNum + 1;
        }

        this.eventsLedger.push(remoteEvent);
        //this.network.eventsLedger = this.eventsLedger;
        console.log(this.sequenceNumber);

        const targetSelector = eventObject.target;
        let target: Element = this.svg;
        let e: Event;
        if(eventObject.type.substr(0, 5) === 'touch') {
            e = document.createEvent('TouchEvent');
            e.initEvent(eventObject.type, true, false);
            for(const prop in eventObject) {
                if(prop !== 'isTrusted' && eventObject.hasOwnProperty(prop)) {
                    Object.defineProperty(e, prop, {
                        writable: true,
                        value: eventObject[prop],
                    });
                }
            }
            //e = new TouchEvent(eventObject.type, eventObject as any);
        } else if(eventObject.type.substr(0, 5) === 'mouse') {
            e = new MouseEvent(eventObject.type, eventObject as any);
        } else if(eventObject.type.substr(0, 4) === 'drag') {
            e = new DragEvent(eventObject.type, eventObject as any);
        } else {
            e = new Event(eventObject.type, eventObject as any);
        }

        if(targetSelector) {
            let newTarget: Element|null = document.querySelector(targetSelector);
            if(!newTarget) {
                console.error('element not found', targetSelector);
                return;
            }
            target = newTarget;
        }
        Object.defineProperty(e, 'target', {
            writable: true,
            value: target,
        });
        Object.defineProperty(e, 'view', {
            writable: true,
            value: window,
        });
        (e as any)['desc-received'] = true;
        target.dispatchEvent(e);
    }
}
