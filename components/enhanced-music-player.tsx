// @ts-nocheck
"use client"
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast, Toaster } from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PlayIcon, PauseIcon, SkipBackIcon, SkipForwardIcon, ShuffleIcon, RepeatIcon, VolumeIcon, Volume2Icon, HeartIcon, StarIcon, PlusCircleIcon } from "lucide-react"

// Initialize Supabase client with options to bypass RLS
const supabase = createClient('https://asizzpgwsulhuhofqwwt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzaXp6cGd3c3VsaHVob2Zxd3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxNDE3MzgsImV4cCI6MjA0MTcxNzczOH0.9tPyIZg2gqeJY_6w-obqtqjhQEMSJDPN1oNXWQDghbI', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <StarIcon
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? "text-yellow-400 fill-current"
              : i === fullStars && hasHalfStar
              ? "text-yellow-400 fill-current"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  )
}

const MusicVisualization = () => (
  <div className="flex items-end justify-center space-x-1 h-16 absolute bottom-0 left-0 right-0">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="w-1 bg-primary opacity-75"
        style={{
          height: `${Math.random() * 100}%`,
          animation: `visualizer 0.5s infinite alternate ${i * 0.1}s`,
        }}
      ></div>
    ))}
  </div>
)

const AddMusicDialog = ({ onAddMusic }) => {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [duration, setDuration] = useState('')
  const [audioFile, setAudioFile] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!audioFile) {
      toast.error('Please upload an audio file')
      return
    }

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('musics')
        .upload(`${Date.now()}_${audioFile.name}`, audioFile)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('musics')
        .getPublicUrl(uploadData.path)

      const newTrack = { 
        title, 
        artist, 
        album, 
        duration, 
        likes: 0, 
        rating: 0,
        audio_url: publicUrlData.publicUrl
      }

      const { data, error } = await supabase.from('tracks').insert(newTrack)
      if (error) throw error

      onAddMusic(data[0])
      toast.success('Track added successfully')
      setTitle('')
      setArtist('')
      setAlbum('')
      setDuration('')
      setAudioFile(null)
    } catch (error) {
      console.error('Error adding track:', error)
      toast.error(`Error adding track: ${error.message}`)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mb-4">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Add Music
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Track</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="artist">Artist</Label>
            <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="album">Album</Label>
            <Input id="album" value={album} onChange={(e) => setAlbum(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3:30" required />
          </div>
          <div>
            <Label htmlFor="audio">Audio File</Label>
            <Input id="audio" type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} required />
          </div>
          <Button type="submit">Add Track</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EnhancedMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [volume, setVolume] = useState(75)
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState([])
  const [isLiked, setIsLiked] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(new Audio())

  useEffect(() => {
    fetchTracks()
  }, [])

  useEffect(() => {
    if (currentTrack) {
      audioRef.current.src = currentTrack.audio_url
      audioRef.current.volume = volume / 100
      if (isPlaying) {
        audioRef.current.play()
      }
    }
  }, [currentTrack, isPlaying, volume])

  useEffect(() => {
    const audio = audioRef.current
    const updateProgress = () => {
      const duration = audio.duration
      const currentTime = audio.currentTime
      setProgress((currentTime / duration) * 100)
    }
    audio.addEventListener('timeupdate', updateProgress)
    return () => audio.removeEventListener('timeupdate', updateProgress)
  }, [])

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase.from('tracks').select('*')
      if (error) throw error
      setPlaylist(data)
      if (data.length > 0 && !currentTrack) {
        setCurrentTrack(data[0])
      }
    } catch (error) {
      console.error('Error fetching tracks:', error)
      toast.error(`Error fetching tracks: ${error.message}`)
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }
  
  const toggleLike = async () => {
    try {
      const newLikeStatus = !isLiked
      setIsLiked(newLikeStatus)
      const { error } = await supabase
        .from('tracks')
        .update({ likes: currentTrack.likes + (newLikeStatus ? 1 : -1) })
        .eq('id', currentTrack.id)
      if (error) throw error
      toast.success(newLikeStatus ? 'Track liked!' : 'Track unliked')
    } catch (error) {
      console.error('Error updating likes:', error)
      toast.error(`Error updating likes: ${error.message}`)
    }
  }

  const addComment = async () => {
    if (comment.trim()) {
      try {
        const newComment = { text: comment, track_id: currentTrack.id }
        const { data, error } = await supabase.from('comments').insert(newComment)
        if (error) throw error
        setComments([...comments, data[0]])
        setComment("")
        toast.success('Comment added')
      } catch (error) {
        console.error('Error adding comment:', error)
        toast.error(`Error adding comment: ${error.message}`)
      }
    }
  }

  const handleAddMusic = (newTrack) => {
    setPlaylist([...playlist, newTrack])
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Toaster />
      {/* Sidebar / Playlist */}
      <aside className="w-80 border-r border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-2xl font-bold mb-4">Playlist</h2>
          <AddMusicDialog onAddMusic={handleAddMusic} />
        </div>
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-4 space-y-2">
            {playlist.map((track) => (
              <div
                key={track.id}
                className={`p-2 rounded-md cursor-pointer hover:bg-accent ${
                  currentTrack?.id === track.id ? "bg-accent" : ""
                }`}
                onClick={() => setCurrentTrack(track)}
              >
                <div className="font-medium">{track.title}</div>
                <div className="text-sm text-muted-foreground">{track.artist}</div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-muted-foreground">{track.likes} likes</div>
                  <StarRating rating={track.rating} />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {currentTrack ? (
          <>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-64 h-64 mx-auto mb-8 bg-accent rounded-md overflow-hidden relative">
                  <img
                    src="/placeholder.svg?height=256&width=256"
                    alt={`${currentTrack.album} cover`}
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && <MusicVisualization />}
                </div>
                <h2 className="text-3xl font-bold mb-2">{currentTrack.title}</h2>
                <p className="text-xl text-muted-foreground mb-4">{currentTrack.artist}</p>
                <p className="text-muted-foreground mb-4">{currentTrack.album}</p>
                <div className="flex justify-center items-center space-x-4 mb-4">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={toggleLike}
                  >
                    <HeartIcon className={`mr-2 h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    {currentTrack.likes + (isLiked ? 1 : 0)}
                  </Button>
                  <StarRating rating={currentTrack.rating} />
                </div>
              </div>
            </div>

            {/* Comments section */}
            <div className="p-4 border-t border-border">
              <h3 className="text-lg font-semibold mb-2">Comments</h3>
              <div className="flex space-x-2 mb-4">
                <Input
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button onClick={addComment}>Post</Button>
              </div>
              <ScrollArea className="h-32">
                {comments.map((c, i) => (
                  <p key={i} className="mb-2 text-sm">{c.text}</p>
                ))}
              </ScrollArea>
            </div>

            {/* Playback controls */}
            <div className="p-4 flex justify-center items-center space-x-4">
              <Button variant="ghost" size="icon">
                <ShuffleIcon className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <SkipBackIcon className="h-6 w-6" />
              </Button>
              <Button size="icon" className="h-12 w-12" onClick={togglePlayPause}>
                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </Button>
              <Button variant="ghost" size="icon">
                <SkipForwardIcon className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <RepeatIcon className="h-6 w-6" />
              </Button>
            </div>

            {/* Progress bar and volume control */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center mb-4">
                <span className="text-sm text-muted-foreground w-12">
                  {formatTime(audioRef.current.currentTime)}
                </span>
                <Slider
                  className="flex-1 mx-4"
                  value={[progress]}
                  max={100}
                  step={1}
                  onValueChange={(value) => {
                    const newTime = (value[0] / 100) * audioRef.current.duration
                    audioRef.current.currentTime = newTime
                    setProgress(value[0])
                  }}
                />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {formatTime(audioRef.current.duration)}
                </span>
              </div>
              <div className="flex items-center">
                <VolumeIcon className="h-5 w-5 text-muted-foreground mr-2" />
                <Slider
                  className="w-32"
                  defaultValue={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(value) => {
                    setVolume(value[0])
                    audioRef.current.volume = value[0] / 100
                  }}
                />
                <Volume2Icon className="h-5 w-5 text-muted-foreground ml-2" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xl text-muted-foreground">No track selected</p>
          </div>
        )}
      </main>
    </div>
  )
}