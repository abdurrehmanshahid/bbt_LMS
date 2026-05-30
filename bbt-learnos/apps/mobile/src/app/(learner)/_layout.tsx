import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={[styles.iconWrap, focused && styles.iconActive]}>
      {children}
    </View>
  );
}

// Simple SVG-free icons using text glyphs
const ICONS: Record<string, string> = {
  feed: '⊟',
  track: '◫',
  portfolio: '◈',
  cohort: '◉',
  notifications: '◻',
};

void ICONS;

export default function LearnerLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#F7941D',
        tabBarInactiveTintColor: '#555588',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <View style={[styles.dot, focused && styles.dotActive]} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="track/[trackId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="module/[moduleId]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: 'Trending',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <View style={[styles.dot, focused && styles.dotActive]} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <View style={[styles.dot, focused && styles.dotActive]} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="cohort"
        options={{
          title: 'Cohort',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <View style={[styles.dot, focused && styles.dotActive]} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <View style={[styles.dot, focused && styles.dotActive]} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#12122e',
    borderTopColor: '#1e1e4e',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  iconWrap: { width: 32, height: 24, alignItems: 'center', justifyContent: 'center' },
  iconActive: {},
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#555588' },
  dotActive: { backgroundColor: '#F7941D', width: 6, height: 6, borderRadius: 3 },
  iconText: { fontSize: 16 },
});
