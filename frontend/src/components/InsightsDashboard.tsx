import { useState } from 'react';
import {
  useInsightsRoleHours,
  useInsightsTagDistribution,
  useInsightsPatterns,
  useJobCategories,
} from '../hooks/useApi';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start_date: formatDate(start),
    end_date: formatDate(end),
  };
}

export function InsightsDashboard() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(undefined);

  const { data: roles } = useJobCategories();
  const { data: roleHours, isLoading: loadingRoleHours } = useInsightsRoleHours(dateRange);
  const { data: tagDistribution, isLoading: loadingTags } = useInsightsTagDistribution({
    ...dateRange,
    role_id: selectedRoleId,
  });
  const { data: patterns, isLoading: loadingPatterns } = useInsightsPatterns({
    ...dateRange,
    role_id: selectedRoleId,
  });

  const maxHours = roleHours?.role_hours.reduce(
    (max, r) => Math.max(max, r.total_hours),
    0
  ) ?? 0;

  return (
    <div className="insights-dashboard">
      <h2>Insights</h2>

      <div className="filters">
        <div className="date-filters">
          <label>
            From:
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start_date: e.target.value }))
              }
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end_date: e.target.value }))
              }
            />
          </label>
        </div>
        <div className="role-filter">
          <label>
            Role:
            <select
              value={selectedRoleId ?? ''}
              onChange={(e) =>
                setSelectedRoleId(e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">All Roles</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="insights-grid">
        {/* Role Hours */}
        <div className="insight-card">
          <h3>Hours by Role</h3>
          {loadingRoleHours ? (
            <div className="loading">Loading...</div>
          ) : roleHours?.role_hours.length === 0 ? (
            <div className="empty">No data for this period</div>
          ) : (
            <div className="bar-chart">
              {roleHours?.role_hours.map((item) => (
                <div key={item.role_id} className="bar-row">
                  <div className="bar-label">{item.role_name}</div>
                  <div className="bar-container">
                    <div
                      className="bar"
                      style={{
                        width: `${(item.total_hours / maxHours) * 100}%`,
                      }}
                    />
                    <span className="bar-value">{item.total_hours.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tag Distribution */}
        <div className="insight-card">
          <h3>Activity Tags</h3>
          {loadingTags ? (
            <div className="loading">Loading...</div>
          ) : tagDistribution?.total_sessions === 0 ? (
            <div className="empty">No sessions in this period</div>
          ) : (
            <div className="tag-distribution">
              <div className="tag-stats">
                <span>{tagDistribution?.total_sessions} total sessions</span>
                <span>{tagDistribution?.sessions_without_tags} without tags</span>
              </div>
              <div className="tag-list">
                {tagDistribution?.tag_distribution.map((tag) => (
                  <div key={tag.id} className="tag-item">
                    <span
                      className="tag-color"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="tag-name">{tag.name}</span>
                    <span className="tag-count">{tag.session_count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Time Patterns */}
        <div className="insight-card">
          <h3>When Sessions Start</h3>
          {loadingPatterns ? (
            <div className="loading">Loading...</div>
          ) : patterns?.hour_distribution.length === 0 ? (
            <div className="empty">No data for this period</div>
          ) : (
            <div className="patterns">
              <div className="pattern-section">
                <h4>By Hour</h4>
                <div className="hour-grid">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const data = patterns?.hour_distribution.find((h) => h.hour === hour);
                    const count = data?.count ?? 0;
                    const maxCount = Math.max(
                      ...((patterns?.hour_distribution.map((h) => h.count)) ?? [1])
                    );
                    const intensity = maxCount > 0 ? count / maxCount : 0;
                    return (
                      <div
                        key={hour}
                        className="hour-cell"
                        style={{
                          backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                        }}
                        title={`${hour}:00 - ${count} sessions`}
                      >
                        {hour}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="pattern-section">
                <h4>By Day</h4>
                <div className="day-list">
                  {patterns?.day_distribution.map((day) => (
                    <div key={day.day_number} className="day-row">
                      <span className="day-name">{day.day}</span>
                      <span className="day-count">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
