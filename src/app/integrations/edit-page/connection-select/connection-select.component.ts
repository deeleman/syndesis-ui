import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { log, getCategory } from '../../../logging';
import { CurrentFlow, FlowEvent } from '../current-flow.service';
import { ConnectionStore } from '../../../store/connection/connection.store';
import { Connections, Connection } from '../../../model';
import { FlowPage } from '../flow-page';
const category = getCategory('Integrations');

@Component({
  moduleId: module.id,
  selector: 'syndesis-integrations-connection-select',
  templateUrl: 'connection-select.component.html',
  styleUrls: ['./connection-select.component.scss'],
})
export class IntegrationsSelectConnectionComponent extends FlowPage
  implements OnInit, OnDestroy {
  loading: Observable<boolean>;
  connections: Observable<Connections>;
  filteredConnections: Subject<Connections> = new BehaviorSubject(
    <Connections>{},
  );
  routeSubscription: Subscription;
  position: number;

  constructor(
    public store: ConnectionStore,
    public currentFlow: CurrentFlow,
    public route: ActivatedRoute,
    public router: Router,
    public detector: ChangeDetectorRef,
  ) {
    super(currentFlow, route, router, detector);
    this.loading = store.loading;
    this.connections = store.list;
  }

  gotoCreateConnection() {
    this.router.navigate(['/connections/create']);
  }

  onSelected(connection: Connection) {
    if (connection === undefined) {
      this.gotoCreateConnection();
      return;
    }
    log.debugc(() => 'Selected connection: ' + connection.name, category);
    this.currentFlow.events.emit({
      kind: 'integration-set-connection',
      position: this.position,
      connection: connection,
      onSave: () => {
        this.router.navigate(['action-select', this.position], {
          relativeTo: this.route.parent,
        });
      },
    });
  }

  goBack() {
    const step = this.currentFlow.getStep(this.position);
    step.connection = undefined;
    super.goBack(['save-or-add-step']);
  }

  positionText() {
    if (this.position === 0) {
      return 'start';
    }
    if (this.position === this.currentFlow.getLastPosition()) {
      return 'finish';
    }
    return '';
  }

  loadConnections() {
    if (!this.currentFlow.loaded) {
      return;
    }
    const step = this.currentFlow.getStep(this.position);
    if (!step || step.stepKind !== 'endpoint') {
      // safety net
      this.router.navigate(['save-or-add-step'], {
        relativeTo: this.route.parent,
      });
      return;
    }
    if (step.connection) {
      this.router.navigate(['action-select', this.position], {
        relativeTo: this.route.parent,
      });
      return;
    }
    this.store.loadAll();
    this.currentFlow.events.emit({
      kind: 'integration-connection-select',
      position: this.position,
    });
  }

  handleFlowEvent(event: FlowEvent) {
    switch (event.kind) {
      case 'integration-updated':
        this.loadConnections();
    }
  }

  ngOnInit() {
    this.routeSubscription = this.route.params
      .pluck<Params, string>('position')
      .map((position: string) => {
        this.position = Number.parseInt(position);
        this.loadConnections();
      })
      .subscribe();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.routeSubscription.unsubscribe();
  }
}
