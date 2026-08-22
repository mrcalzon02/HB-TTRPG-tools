package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 037: immutable one-edition-per-simulation-day newspaper archive and frozen ticker articles. */
public final class DailyNewspaperSchema {
    private DailyNewspaperSchema() { }

    public static List<String> statements() {
        return List.of(
                "CREATE TABLE IF NOT EXISTS daily_newspaper_edition ("
                        + "edition_id TEXT PRIMARY KEY, world_id TEXT NOT NULL, edition_date TEXT NOT NULL, "
                        + "period_start_time TEXT NOT NULL, period_end_time TEXT NOT NULL, "
                        + "start_tick INTEGER NOT NULL CHECK(start_tick>=0), end_tick INTEGER NOT NULL CHECK(end_tick>=start_tick), "
                        + "sealed_tick INTEGER NOT NULL CHECK(sealed_tick>end_tick), sealed_time TEXT NOT NULL, "
                        + "masthead TEXT NOT NULL, lead_headline TEXT NOT NULL, article_count INTEGER NOT NULL DEFAULT 0 CHECK(article_count>=0), "
                        + "top_severity INTEGER NOT NULL DEFAULT 0 CHECK(top_severity BETWEEN 0 AND 100), "
                        + "UNIQUE(world_id,edition_date), FOREIGN KEY(world_id) REFERENCES world_metadata(world_id))",
                "CREATE INDEX IF NOT EXISTS daily_newspaper_edition_date_index ON daily_newspaper_edition(world_id,edition_date DESC)",
                "CREATE TABLE IF NOT EXISTS daily_newspaper_article ("
                        + "article_id TEXT PRIMARY KEY, edition_id TEXT NOT NULL, world_id TEXT NOT NULL, source_key TEXT NOT NULL, "
                        + "source_tick INTEGER NOT NULL CHECK(source_tick>=0), source_category TEXT NOT NULL, severity INTEGER NOT NULL CHECK(severity BETWEEN 0 AND 100), "
                        + "station_id TEXT, station_name TEXT NOT NULL, headline TEXT NOT NULL, dek TEXT NOT NULL, body TEXT NOT NULL, "
                        + "conditions_snapshot TEXT NOT NULL, evidence_summary TEXT NOT NULL, article_order INTEGER NOT NULL CHECK(article_order>=0), "
                        + "UNIQUE(edition_id,source_key), FOREIGN KEY(edition_id) REFERENCES daily_newspaper_edition(edition_id) ON DELETE CASCADE, "
                        + "FOREIGN KEY(world_id) REFERENCES world_metadata(world_id), FOREIGN KEY(station_id) REFERENCES world_station(station_id))",
                "CREATE INDEX IF NOT EXISTS daily_newspaper_article_edition_index ON daily_newspaper_article(edition_id,article_order,severity DESC,source_tick DESC)",
                "CREATE VIEW IF NOT EXISTS daily_newspaper_observation AS "
                        + "SELECT e.edition_id,e.world_id,e.edition_date,e.period_start_time,e.period_end_time,e.start_tick,e.end_tick,"
                        + "e.sealed_tick,e.sealed_time,e.masthead,e.lead_headline,e.article_count,e.top_severity,"
                        + "a.article_id,a.source_key,a.source_tick,a.source_category,a.severity,a.station_id,a.station_name,"
                        + "a.headline,a.dek,a.body,a.conditions_snapshot,a.evidence_summary,a.article_order "
                        + "FROM daily_newspaper_edition e LEFT JOIN daily_newspaper_article a ON a.edition_id=e.edition_id",
                rolloverTrigger()
        );
    }

    private static String rolloverTrigger() {
        return """
                CREATE TRIGGER IF NOT EXISTS daily_newspaper_midnight_rollover
                AFTER UPDATE OF canonical_time,current_tick_sequence ON world_simulation_metadata
                WHEN OLD.canonical_time IS NOT NULL AND NEW.canonical_time IS NOT NULL
                  AND date(NEW.canonical_time)>date(OLD.canonical_time)
                BEGIN
                    INSERT OR IGNORE INTO daily_newspaper_edition(
                        edition_id,world_id,edition_date,period_start_time,period_end_time,start_tick,end_tick,
                        sealed_tick,sealed_time,masthead,lead_headline,article_count,top_severity)
                    VALUES(
                        NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,date(OLD.canonical_time),
                        date(OLD.canonical_time)||'T00:00:00Z',date(NEW.canonical_time)||'T00:00:00Z',
                        MAX(0,NEW.current_tick_sequence-CAST(86400.0/MAX(1,COALESCE(NEW.tick_size_seconds,60)) AS INTEGER)),
                        MAX(0,NEW.current_tick_sequence-1),NEW.current_tick_sequence,NEW.canonical_time,
                        'THE EUROPA DAILY OBSERVER','Daily dispatch for '||date(OLD.canonical_time),0,0);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':station:'||e.event_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'station:'||e.event_id,
                           e.tick_sequence,
                           CASE e.event_type WHEN 'ATTACK' THEN 'SECURITY' WHEN 'ACCIDENT' THEN 'SECURITY'
                                WHEN 'SABOTAGE' THEN 'SECURITY' WHEN 'SHORTAGE' THEN 'ECONOMY'
                                WHEN 'DELIVERY' THEN 'ECONOMY' WHEN 'PRODUCTION' THEN 'ECONOMY'
                                WHEN 'CONSUMPTION' THEN 'ECONOMY' WHEN 'POPULATION' THEN 'POPULATION'
                                WHEN 'FACTION_PLAN' THEN 'INSTITUTION' WHEN 'RESEARCH' THEN 'RESEARCH' ELSE 'STATION' END,
                           MIN(100,e.severity*20),e.station_id,s.display_name,e.headline,
                           replace(e.event_type,'_',' ')||' · severity '||MIN(100,e.severity*20),
                           e.headline||char(10)||char(10)||upper(s.display_name)||' — '||e.narrative||char(10)||char(10)||
                           'END-OF-DAY CONDITIONS — Status '||COALESCE(ss.status,'UNKNOWN')||'; credits '||COALESCE(ss.credits,0)||
                           '; supplies '||COALESCE(ss.supplies,0)||'; ore '||COALESCE(ss.ore,0)||'; industry '||COALESCE(ss.industry,0)||
                           '; security '||COALESCE(ss.security,0)||'; integrity '||COALESCE(ss.integrity,0)||'; threat '||COALESCE(ss.threat,0)||
                           '; research '||COALESCE(ss.research,0)||'; population '||COALESCE(pop.total_population,0)||'.'||char(10)||char(10)||
                           'This report is frozen at the daily edition boundary. Later consequences belong to later editions.',
                           'Station: '||s.display_name||char(10)||'Status: '||COALESCE(ss.status,'UNKNOWN')||char(10)||
                           'Credits: '||COALESCE(ss.credits,0)||char(10)||'Supplies: '||COALESCE(ss.supplies,0)||char(10)||
                           'Ore: '||COALESCE(ss.ore,0)||char(10)||'Industry: '||COALESCE(ss.industry,0)||char(10)||
                           'Security: '||COALESCE(ss.security,0)||char(10)||'Integrity: '||COALESCE(ss.integrity,0)||char(10)||
                           'Threat: '||COALESCE(ss.threat,0)||char(10)||'Research: '||COALESCE(ss.research,0)||char(10)||
                           'Population: '||COALESCE(pop.total_population,0)||char(10)||'Controlling faction: '||COALESCE(pol.controlling_major_faction,'—')||char(10)||
                           'Control state: '||COALESCE(pol.contest_state,'—'),
                           e.narrative,100-MIN(100,e.severity*20)
                    FROM station_event e
                    JOIN world_station s ON s.station_id=e.station_id
                    LEFT JOIN station_simulation_state ss ON ss.station_id=e.station_id
                    LEFT JOIN npc_population_observation pop ON pop.station_id=e.station_id
                    LEFT JOIN station_political_observation pol ON pol.station_id=e.station_id
                    WHERE e.world_id=NEW.world_id AND e.visibility<>'HIDDEN'
                      AND (e.severity>=2 OR e.event_type IN ('ATTACK','ACCIDENT','SABOTAGE','SHORTAGE','POPULATION','FACTION_PLAN','FRONTIER_CHANGE'))
                      AND date(COALESCE(e.canonical_time,strftime('%Y-%m-%dT%H:%M:%fZ',julianday(NEW.canonical_time)
                          +((e.tick_sequence-NEW.current_tick_sequence)*COALESCE(NEW.tick_size_seconds,60))/86400.0)))=date(OLD.canonical_time);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':institution:'||n.news_event_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'institution:'||n.news_event_id,
                           n.tick_sequence,'INSTITUTION',n.severity,n.station_id,COALESCE(s.display_name,'Europa-wide desk'),
                           n.headline,replace(n.event_type,'_',' ')||' · severity '||n.severity,
                           n.headline||char(10)||char(10)||upper(COALESCE(s.display_name,'EUROPA-WIDE DESK'))||' — '||n.details||char(10)||char(10)||
                           CASE WHEN s.station_id IS NULL THEN 'No station-specific operational snapshot applies to this network-wide report.' ELSE
                           'END-OF-DAY CONDITIONS — Status '||COALESCE(ss.status,'UNKNOWN')||'; credits '||COALESCE(ss.credits,0)||
                           '; supplies '||COALESCE(ss.supplies,0)||'; security '||COALESCE(ss.security,0)||'; integrity '||COALESCE(ss.integrity,0)||
                           '; threat '||COALESCE(ss.threat,0)||'; population '||COALESCE(pop.total_population,0)||'; control '||COALESCE(pol.controlling_major_faction,'—')||'.' END
                           ||char(10)||char(10)||'This institutional report is frozen at the daily edition boundary.',
                           CASE WHEN s.station_id IS NULL THEN 'Station: Europa-wide desk' ELSE
                           'Station: '||s.display_name||char(10)||'Status: '||COALESCE(ss.status,'UNKNOWN')||char(10)||
                           'Credits: '||COALESCE(ss.credits,0)||char(10)||'Supplies: '||COALESCE(ss.supplies,0)||char(10)||
                           'Security: '||COALESCE(ss.security,0)||char(10)||'Integrity: '||COALESCE(ss.integrity,0)||char(10)||
                           'Threat: '||COALESCE(ss.threat,0)||char(10)||'Population: '||COALESCE(pop.total_population,0)||char(10)||
                           'Controlling faction: '||COALESCE(pol.controlling_major_faction,'—')||char(10)||'Control state: '||COALESCE(pol.contest_state,'—') END,
                           n.details,100-n.severity
                    FROM organization_news_event n
                    LEFT JOIN world_station s ON s.station_id=n.station_id
                    LEFT JOIN station_simulation_state ss ON ss.station_id=n.station_id
                    LEFT JOIN npc_population_observation pop ON pop.station_id=n.station_id
                    LEFT JOIN station_political_observation pol ON pol.station_id=n.station_id
                    WHERE n.world_id=NEW.world_id
                      AND date(strftime('%Y-%m-%dT%H:%M:%fZ',julianday(NEW.canonical_time)
                          +((n.tick_sequence-NEW.current_tick_sequence)*COALESCE(NEW.tick_size_seconds,60))/86400.0))=date(OLD.canonical_time);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':voyage:'||l.log_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'voyage:'||l.log_id,
                           l.tick_sequence,'VOYAGE',l.severity,v.home_station_id,COALESCE(s.display_name,'Europa traffic desk'),
                           v.display_name||': '||replace(l.event_type,'_',' '),l.summary,
                           v.display_name||': '||replace(l.event_type,'_',' ')||char(10)||char(10)||upper(COALESCE(s.display_name,'EUROPA TRAFFIC DESK'))||
                           ' — '||l.details||char(10)||char(10)||'The vessel report closed with hull change '||l.hull_delta||
                           ' and supplies change '||l.supplies_delta||'. This account is frozen at the daily edition boundary.',
                           CASE WHEN s.station_id IS NULL THEN 'Station: Europa traffic desk' ELSE 'Home station: '||s.display_name||char(10)||
                           'Status: '||COALESCE(ss.status,'UNKNOWN')||char(10)||'Supplies: '||COALESCE(ss.supplies,0)||char(10)||
                           'Security: '||COALESCE(ss.security,0)||char(10)||'Threat: '||COALESCE(ss.threat,0) END,
                           l.summary||' '||l.details,100-l.severity
                    FROM npc_voyage_log l JOIN npc_vessel v ON v.npc_vessel_id=l.npc_vessel_id
                    LEFT JOIN world_station s ON s.station_id=v.home_station_id
                    LEFT JOIN station_simulation_state ss ON ss.station_id=v.home_station_id
                    WHERE l.world_id=NEW.world_id AND l.severity>=20 AND date(l.canonical_time)=date(OLD.canonical_time);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':encounter:'||e.encounter_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'encounter:'||e.encounter_id,
                           e.tick_sequence,'ENCOUNTER',MIN(100,e.challenge),v.home_station_id,COALESCE(s.display_name,'Europa traffic desk'),
                           v.display_name||' reports '||replace(e.hazard_type,'_',' '),'Outcome: '||replace(e.outcome,'_',' '),
                           v.display_name||' reports '||replace(e.hazard_type,'_',' ')||char(10)||char(10)||upper(COALESCE(s.display_name,'EUROPA TRAFFIC DESK'))||
                           ' — '||e.narrative||char(10)||char(10)||'Challenge rating '||e.challenge||'; recorded outcome '||replace(e.outcome,'_',' ')||
                           '. This encounter report is frozen at the daily edition boundary.',
                           CASE WHEN s.station_id IS NULL THEN 'Station: Europa traffic desk' ELSE 'Home station: '||s.display_name||char(10)||
                           'Status: '||COALESCE(ss.status,'UNKNOWN')||char(10)||'Security: '||COALESCE(ss.security,0)||char(10)||
                           'Integrity: '||COALESCE(ss.integrity,0)||char(10)||'Threat: '||COALESCE(ss.threat,0) END,
                           e.narrative,100-MIN(100,e.challenge)
                    FROM world_encounter e JOIN npc_vessel v ON v.npc_vessel_id=e.npc_vessel_id
                    LEFT JOIN world_station s ON s.station_id=v.home_station_id
                    LEFT JOIN station_simulation_state ss ON ss.station_id=v.home_station_id
                    WHERE e.world_id=NEW.world_id AND date(e.canonical_time)=date(OLD.canonical_time);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':fleet:'||l.log_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'fleet:'||l.log_id,
                           l.tick_sequence,'FLEET',MIN(100,o.difficulty),COALESCE(o.target_station_id,o.origin_station_id),
                           COALESCE(s.display_name,loc.display_name,'Europa fleet desk'),'Fleet response: '||replace(l.event_type,'_',' '),l.summary,
                           'Fleet response: '||replace(l.event_type,'_',' ')||char(10)||char(10)||upper(COALESCE(s.display_name,loc.display_name,'EUROPA FLEET DESK'))||
                           ' — '||l.summary||char(10)||char(10)||'Operation difficulty '||o.difficulty||'. The report is frozen at the daily edition boundary.',
                           CASE WHEN s.station_id IS NULL THEN 'Location: '||COALESCE(loc.display_name,'Europa fleet desk') ELSE
                           'Station: '||s.display_name||char(10)||'Status: '||COALESCE(ss.status,'UNKNOWN')||char(10)||
                           'Supplies: '||COALESCE(ss.supplies,0)||char(10)||'Security: '||COALESCE(ss.security,0)||char(10)||
                           'Integrity: '||COALESCE(ss.integrity,0)||char(10)||'Threat: '||COALESCE(ss.threat,0) END,
                           l.summary,100-MIN(100,o.difficulty)
                    FROM fleet_response_log l JOIN fleet_response_operation o ON o.operation_id=l.operation_id
                    LEFT JOIN world_station s ON s.station_id=COALESCE(o.target_station_id,o.origin_station_id)
                    LEFT JOIN station_simulation_state ss ON ss.station_id=s.station_id
                    LEFT JOIN world_location loc ON loc.location_id=o.target_location_id
                    WHERE l.world_id=NEW.world_id
                      AND date(strftime('%Y-%m-%dT%H:%M:%fZ',julianday(NEW.canonical_time)
                          +((l.tick_sequence-NEW.current_tick_sequence)*COALESCE(NEW.tick_size_seconds,60))/86400.0))=date(OLD.canonical_time);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':natural:'||n.event_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'natural:'||n.event_id,
                           n.tick_sequence,'NATURAL',n.severity,ws.station_id,l.display_name,
                           replace(n.event_type,'_',' ')||' recorded near '||l.display_name,'Environmental watch · severity '||n.severity,
                           replace(n.event_type,'_',' ')||' recorded near '||l.display_name||char(10)||char(10)||upper(l.display_name)||' — '||n.summary||char(10)||char(10)||
                           CASE WHEN ws.station_id IS NULL THEN 'No station-specific operational snapshot applies to this location.' ELSE
                           'Nearby station conditions closed at status '||COALESCE(ss.status,'UNKNOWN')||', security '||COALESCE(ss.security,0)||
                           ', integrity '||COALESCE(ss.integrity,0)||' and threat '||COALESCE(ss.threat,0)||'.' END||
                           char(10)||char(10)||'Environmental conditions may evolve later; this account remains frozen to the edition boundary.',
                           CASE WHEN ws.station_id IS NULL THEN 'Location: '||l.display_name ELSE 'Station: '||ws.display_name||char(10)||
                           'Status: '||COALESCE(ss.status,'UNKNOWN')||char(10)||'Security: '||COALESCE(ss.security,0)||char(10)||
                           'Integrity: '||COALESCE(ss.integrity,0)||char(10)||'Threat: '||COALESCE(ss.threat,0) END,
                           n.summary,100-n.severity
                    FROM natural_world_event n JOIN world_location l ON l.location_id=n.location_id
                    LEFT JOIN world_station ws ON ws.location_id=n.location_id
                    LEFT JOIN station_simulation_state ss ON ss.station_id=ws.station_id
                    WHERE n.world_id=NEW.world_id AND n.severity>=25
                      AND date(strftime('%Y-%m-%dT%H:%M:%fZ',julianday(NEW.canonical_time)
                          +((n.tick_sequence-NEW.current_tick_sequence)*COALESCE(NEW.tick_size_seconds,60))/86400.0))=date(OLD.canonical_time);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':population:'||p.ledger_id,
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'population:'||p.ledger_id,
                           p.tick_sequence,'POPULATION',MIN(100,MAX(10,ABS(p.after_total-p.before_total)/5)),p.station_id,s.display_name,
                           s.display_name||CASE WHEN p.after_total>p.before_total THEN ' population rises' ELSE ' population contracts' END,
                           printf('%+d residents',p.after_total-p.before_total)||' · '||replace(p.primary_cause,'_',' '),
                           s.display_name||CASE WHEN p.after_total>p.before_total THEN ' population rises' ELSE ' population contracts' END||char(10)||char(10)||
                           upper(s.display_name)||' — '||p.summary||char(10)||char(10)||'The conserved population ledger moved from '||p.before_total||' to '||p.after_total||
                           ' residents. End-of-day morale was '||p.morale||'. This demographic report is frozen at the daily edition boundary.',
                           'Station: '||s.display_name||char(10)||'Population before: '||p.before_total||char(10)||'Population after: '||p.after_total||char(10)||
                           'Morale: '||p.morale||char(10)||'Housing capacity: '||p.housing_capacity||char(10)||'Life-support capacity: '||p.life_support_capacity||char(10)||
                           'Employment capacity: '||p.employment_capacity,
                           p.summary,100-MIN(100,MAX(10,ABS(p.after_total-p.before_total)/5))
                    FROM npc_population_ledger p JOIN world_station s ON s.station_id=p.station_id
                    WHERE p.world_id=NEW.world_id AND p.before_total<>p.after_total
                      AND date(strftime('%Y-%m-%dT%H:%M:%fZ',julianday(NEW.canonical_time)
                          +((p.tick_sequence-NEW.current_tick_sequence)*COALESCE(NEW.tick_size_seconds,60))/86400.0))=date(OLD.canonical_time);

                    DELETE FROM daily_newspaper_article
                    WHERE edition_id=NEW.world_id||':daily-news:'||date(OLD.canonical_time)
                      AND article_id IN (
                        SELECT article_id FROM daily_newspaper_article
                        WHERE edition_id=NEW.world_id||':daily-news:'||date(OLD.canonical_time)
                        ORDER BY severity DESC,source_tick DESC,source_key LIMIT -1 OFFSET 40);

                    INSERT OR IGNORE INTO daily_newspaper_article(
                        article_id,edition_id,world_id,source_key,source_tick,source_category,severity,station_id,
                        station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order)
                    SELECT NEW.world_id||':daily-news:'||date(OLD.canonical_time)||':quiet-watch',
                           NEW.world_id||':daily-news:'||date(OLD.canonical_time),NEW.world_id,'quiet-watch:'||date(OLD.canonical_time),
                           MAX(0,NEW.current_tick_sequence-1),'WORLD',0,NULL,'Europa-wide desk','Quiet watch closes across Europa',
                           'No reportable committed event crossed the daily editorial threshold.',
                           'Quiet watch closes across Europa'||char(10)||char(10)||'EUROPA-WIDE DESK — No station, voyage, encounter, fleet, natural, institutional, or population event crossed the daily editorial threshold.'||char(10)||char(10)||
                           'The absence of a headline is itself frozen to this edition; later events belong to the following paper.',
                           'Station: Europa-wide desk'||char(10)||'Daily operational snapshot: no reportable event',
                           'No reportable committed event crossed the daily editorial threshold.',100
                    WHERE NOT EXISTS (SELECT 1 FROM daily_newspaper_article WHERE edition_id=NEW.world_id||':daily-news:'||date(OLD.canonical_time));

                    UPDATE daily_newspaper_edition
                    SET article_count=(SELECT COUNT(*) FROM daily_newspaper_article a WHERE a.edition_id=daily_newspaper_edition.edition_id),
                        top_severity=COALESCE((SELECT MAX(a.severity) FROM daily_newspaper_article a WHERE a.edition_id=daily_newspaper_edition.edition_id),0),
                        lead_headline=COALESCE((SELECT a.headline FROM daily_newspaper_article a
                            WHERE a.edition_id=daily_newspaper_edition.edition_id ORDER BY a.severity DESC,a.source_tick DESC,a.source_key LIMIT 1),lead_headline)
                    WHERE edition_id=NEW.world_id||':daily-news:'||date(OLD.canonical_time);
                END
                """;
    }
}
