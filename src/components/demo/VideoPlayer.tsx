import React, { useState } from 'react';

interface VideoPlayerProps {
    videoUrl: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
    const [showEmbed, setShowEmbed] = useState(false);

    // Extract YouTube video ID
    const getYouTubeId = (url: string): string | null => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    const videoId = getYouTubeId(videoUrl);

    if (!videoId) {
        return (
            <div className="video-player-error">
                <p>Could not load tutorial video.</p>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    Watch on YouTube
                </a>
            </div>
        );
    }

    return (
        <div className="video-player-container">
            {!showEmbed ? (
                <div className="video-player-preview" onClick={() => setShowEmbed(true)}>
                    <img
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt="Tutorial Video Preview"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }}
                    />
                    <button
                        className="video-play-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowEmbed(true);
                        }}
                    >
                        <span>▶</span> Play Tutorial
                    </button>
                </div>
            ) : (
                <div className="video-player-embed">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
                        title="Tutorial Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}

            <div className="video-player-actions">
                <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-external-link"
                >
                    Watch on YouTube.com →
                </a>
            </div>
        </div>
    );
};
