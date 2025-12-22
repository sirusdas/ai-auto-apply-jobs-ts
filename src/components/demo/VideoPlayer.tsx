import React from 'react';

interface VideoPlayerProps {
    videoUrl: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
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
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="video-external-link">
                    Watch on YouTube →
                </a>
            </div>
        );
    }

    return (
        <div className="video-player-container">
            <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="video-player-preview"
            >
                <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Tutorial Video Preview"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                />
                <div className="video-play-overlay">
                    <div className="video-play-button">
                        <span>▶</span>
                    </div>
                    <div className="video-play-text">Click to watch on YouTube</div>
                </div>
            </a>

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
