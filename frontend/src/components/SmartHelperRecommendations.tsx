// frontend/src/components/SmartHelperRecommendations.tsx
// Display smart-tagged helper recommendations

import React, { useEffect, useState } from 'react';
import { MapPin, Star, Zap, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface HelperRecommendation {
  _id: string;
  fullName: string;
  distanceKm: number;
  rating: number;
  isAvailable: boolean;
  tags: string[];
  metrics: {
    rating: number;
    responseTime: number;
    completedRequests: number;
    activeRequests: number;
  };
}

interface SmartHelperRecommendationsProps {
  requestId: string;
  limit?: number;
  onSelectHelper?: (helperId: string, helperName: string) => void;
}

/**
 * Helper Card Component
 */
const HelperCard: React.FC<{
  helper: HelperRecommendation;
  onSelect: () => void;
}> = ({ helper, onSelect }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-semibold text-gray-900">{helper.fullName}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
          <MapPin className="w-4 h-4" />
          <span>{helper.distanceKm.toFixed(1)} km away</span>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-semibold text-gray-900">{helper.rating.toFixed(1)}</span>
        </div>
        <span className={`text-xs font-medium ${helper.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
          {helper.isAvailable ? ' Online' : ' Offline'}
        </span>
      </div>
    </div>

    {/* Tags */}
    <div className="flex flex-wrap gap-2 mb-3">
      {helper.tags.map((tag, idx) => (
        <span
          key={idx}
          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
        >
          {tag}
        </span>
      ))}
    </div>

    {/* Metrics */}
    <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b">
      <span>{helper.metrics.completedRequests} completed</span>
      <span>Avg response: {Math.round(helper.metrics.responseTime / 60)}m</span>
      <span>{helper.metrics.activeRequests} active</span>
    </div>

    {/* Action */}
    <button
      onClick={onSelect}
      disabled={!helper.isAvailable}
      className="w-full py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {helper.isAvailable ? 'Select Helper' : 'Not Available'}
    </button>
  </div>
);

/**
 * Smart Helper Recommendations Component
 */
export const SmartHelperRecommendations: React.FC<SmartHelperRecommendationsProps> = ({
  requestId,
  limit = 5,
  onSelectHelper,
}) => {
  const [helpers, setHelpers] = useState<HelperRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestTags, setRequestTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/requests/${requestId}/recommended-helpers`,
          { params: { limit } }
        );

        const data = response.data.data;
        setHelpers(data.recommendedHelpers || []);
        setRequestTags(data.requestTags || []);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        setError('Failed to find available helpers');
      } finally {
        setLoading(false);
      }
    };

    if (requestId) {
      fetchRecommendations();
    }
  }, [requestId, limit]);

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Finding best helpers nearby...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
        <p className="text-red-800 font-medium text-sm">{error}</p>
      </div>
    );
  }

  if (helpers.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto mb-2" />
        <p className="text-yellow-800 font-medium text-sm">No helpers available right now</p>
        <p className="text-yellow-700 text-xs mt-1">Please try again in a few moments</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Request Tags */}
      {requestTags.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-purple-900 mb-2">Request Priority:</p>
          <div className="flex flex-wrap gap-2">
            {requestTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-1 text-xs bg-purple-200 text-purple-900 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Helpers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {helpers.map((helper) => (
          <HelperCard
            key={helper._id}
            helper={helper}
            onSelect={() => onSelectHelper?.(helper._id, helper.fullName)}
          />
        ))}
      </div>

      {/* Top Helper Highlight */}
      {helpers.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">TOP RECOMMENDATION:</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{helpers[0].fullName}</p>
              <p className="text-sm text-gray-600"> {helpers[0].rating.toFixed(1)}   {helpers[0].distanceKm.toFixed(1)}km</p>
            </div>
            <button
              onClick={() => onSelectHelper?.(helpers[0]._id, helpers[0].fullName)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartHelperRecommendations;
