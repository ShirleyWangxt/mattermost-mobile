// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EventOnCandidate, EventOnConnectionStateChange, RTCIceCandidate} from 'react-native-webrtc';
import RTCTrackEvent from 'react-native-webrtc/lib/typescript/RTCTrackEvent';

declare module 'react-native-webrtc' {
    export type RTCIceCredentialType = 'password';

    export interface RTCIceServer {
        credential?: string;
        credentialType?: RTCIceCredentialType;
        urls: string | string[];
        username?: string;
    }

    export interface RTCPeerConnectionIceEvent extends Event {
        readonly candidate: RTCIceCandidate | null;
    }

    export class RTCPeerConnection {
        onconnectionstatechange?: (event: Event) => void | undefined;
        onnegotiationneeded?: () => void | Promise<void> | undefined;
        onicecandidate?: (event: EventOnCandidate) => void | undefined;
        oniceconnectionstatechange?: (event: EventOnConnectionStateChange) => void | undefined;
        ontrack?: (event: RTCTrackEvent) => void | undefined;
    }
}
