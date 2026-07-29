'use client';

import { useEffect, useCallback } from 'react';
import { useVoiceStore } from '@/store/voiceStore';
import { voiceApi } from '@/lib/api';
import { getSocket } from './useSocket';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export function useVoiceChat(roomId: string) {
  const voice = useVoiceStore();
  const { user } = useAuthStore();
  const socket = getSocket();

  const createPeerConnection = useCallback(
    async (targetUserId: string, iceServers: RTCIceServer[]) => {
      const pc = new RTCPeerConnection({ iceServers });

      if (voice.localStream) {
        voice.localStream.getTracks().forEach((track) => {
          pc.addTrack(track, voice.localStream!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit('voice:ice:candidate', {
            targetUserId,
            roomId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        voice.addPeerStream(targetUserId, remoteStream);
      };

      voice.addPeerConnection(targetUserId, pc);
      return pc;
    },
    [voice, socket, roomId],
  );

  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      voice.setLocalStream(stream);
      voice.setRoom(roomId);

      const res = await voiceApi.getIceServers();
      const { iceServers } = res.data as { iceServers: RTCIceServer[] };

      socket?.emit('voice:join', { roomId });

      // Handle new peer joining — create offer
      socket?.on('voice:participant:join', async (data: { userId: string; existingPeers: string[] }) => {
        if (data.userId === user?._id) return;

        // Create offer for new peer
        const pc = await createPeerConnection(data.userId, iceServers);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('voice:offer', {
          targetUserId: data.userId,
          roomId,
          sdp: offer,
        });

        voice.addPeer({ userId: data.userId, username: '', isMuted: false });
      });

      // For existing peers in room, they will send us offers
      socket?.on('voice:offer', async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = await createPeerConnection(data.fromUserId, iceServers);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice:answer', {
          targetUserId: data.fromUserId,
          roomId,
          sdp: answer,
        });
      });

      socket?.on('voice:answer', async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
        const pc = voice.peerConnections.get(data.fromUserId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      });

      socket?.on('voice:ice:candidate', async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
        const pc = voice.peerConnections.get(data.fromUserId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      socket?.on('voice:participant:leave', (data: { userId: string }) => {
        const pc = voice.peerConnections.get(data.userId);
        if (pc) {
          pc.close();
          voice.removePeerConnection(data.userId);
        }
        voice.removePeer(data.userId);
      });

      socket?.on('voice:mute', (data: { userId: string }) => {
        voice.updatePeerMute(data.userId, true);
      });

      socket?.on('voice:unmute', (data: { userId: string }) => {
        voice.updatePeerMute(data.userId, false);
      });
    } catch (error) {
      toast.error('Failed to access microphone. Please check permissions.');
      console.error('Voice join failed:', error);
    }
  }, [roomId, socket, user, voice, createPeerConnection]);

  const leaveVoice = useCallback(() => {
    socket?.emit('voice:leave', { roomId });
    socket?.off('voice:participant:join');
    socket?.off('voice:offer');
    socket?.off('voice:answer');
    socket?.off('voice:ice:candidate');
    socket?.off('voice:participant:leave');
    socket?.off('voice:mute');
    socket?.off('voice:unmute');
    voice.leaveVoice();
  }, [roomId, socket, voice]);

  const toggleMute = useCallback(() => {
    const newMuted = !voice.isMuted;
    voice.toggleMute();
    if (newMuted) {
      socket?.emit('voice:mute', { roomId });
    } else {
      socket?.emit('voice:unmute', { roomId });
    }
  }, [voice, socket, roomId]);

  useEffect(() => {
    return () => {
      if (voice.isInVoice) {
        leaveVoice();
      }
    };
  }, []);

  return { joinVoice, leaveVoice, toggleMute, ...voice };
}
