import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';

export default function CreatorLayout(): React.JSX.Element {
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
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused }) => <TabDot focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabDot({ focused }: { focused: boolean }): React.JSX.Element {
  return (
    <View style={[styles.dot, focused && styles.dotActive]} />
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
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#555588' },
  dotActive: { backgroundColor: '#F7941D', width: 6, height: 6, borderRadius: 3 },
});
